/* eslint-disable @typescript-eslint/no-explicit-any */
export type NodeId = number;
export type LinkId = number;

export interface GraphNode {
  id: NodeId;
  connectedLinkIds: Set<LinkId>;
  [key: string]: any;
}

export interface GraphLink {
  id: LinkId;
  source: GraphNode;
  target: GraphNode;
  [key: string]: any;
}

export type SerializableNode = Omit<GraphNode, 'connectedLinkIds'>;
export type SerializableLink = Omit<GraphLink, 'source' | 'target'> & {
  source: NodeId;
  target: NodeId;
};

type GraphEventHandlers = {
  newNode: ((node: GraphNode) => void)[];
  newLink: ((link: GraphLink) => void)[];
  removeNode: ((node: GraphNode) => void)[];
  removeLink: ((link: GraphLink) => void)[];
};

export class ObservableGraph {
  public readonly nodes: Map<NodeId, GraphNode>;
  public readonly links: Map<LinkId, GraphLink>;

  private handlers: GraphEventHandlers;

  // ID counters for automatic ID generation
  private nextNodeId: NodeId = 0;
  private nextLinkId: LinkId = 0;

  /**
   * Creates an ObservableGraph instance. Can optionally be initialized with existing graph data.
   * @param initialNodes An array of node data to populate the graph.
   * @param initialLinks An array of link data to populate the graph. Link source/target should be NodeIds.
   */
  constructor(initialNodes?: SerializableNode[], initialLinks?: SerializableLink[]) {
    this.nodes = new Map();
    this.links = new Map();
    this.handlers = {
      newNode: [],
      newLink: [],
      removeNode: [],
      removeLink: [],
    };
    this.nextNodeId = 0;
    this.nextLinkId = 0;

    let maxNodeId = -1;
    let maxLinkId = -1;

    if (initialNodes) {
      for (const nodeData of initialNodes) {
        if (this.nodes.has(nodeData.id)) {
          console.warn(`Duplicate node ID ${nodeData.id} found in initialNodes. Skipping.`);
          continue;
        }

        nodeData.id = nodeData.id ?? this.nextNodeId++;
        const newNode: GraphNode = {
          ...nodeData,
          id: nodeData.id,
          connectedLinkIds: new Set(),
        };
        this.nodes.set(nodeData.id, newNode);
        maxNodeId = Math.max(maxNodeId, nodeData.id);
      }
    }

    if (initialLinks) {
      for (const linkData of initialLinks) {
        if (this.links.has(linkData.id)) {
          console.warn(`Duplicate link ID ${linkData.id} found in initialLinks. Skipping.`);
          continue;
        }
        const sourceNode = this.nodes.get(linkData.source);
        const targetNode = this.nodes.get(linkData.target);

        if (!sourceNode) {
          console.error(`Source node with ID ${linkData.source} not found for link ${linkData.id}. Skipping link.`);
          continue;
        }
        if (!targetNode) {
          console.error(`Target node with ID ${linkData.target} not found for link ${linkData.id}. Skipping link.`);
          continue;
        }

        linkData.id = linkData.id ?? this.nextLinkId++;
        const newLink: GraphLink = {
          ...linkData,
          id: linkData.id,
          source: sourceNode,
          target: targetNode,
        };
        this.links.set(linkData.id, newLink);

        sourceNode.connectedLinkIds.add(linkData.id);
        targetNode.connectedLinkIds.add(linkData.id);
        maxLinkId = Math.max(maxLinkId, linkData.id);
      }
    }

    this.nextNodeId = maxNodeId >= 0 ? maxNodeId + 1 : 0;
    this.nextLinkId = maxLinkId >= 0 ? maxLinkId + 1 : 0;
  }

  // Event Registration

  public onChange(handler: () => unknown) {
    this.onNewNode(handler);
    this.onNewLink(handler);
    this.onRemoveNode(handler);
    this.onRemoveLink(handler);
  }
  public onNodesChange(handler: () => unknown) {
    this.onNewNode(handler);
    this.onRemoveNode(handler);
  }
  public onLinksChange(handler: () => unknown) {
    this.onNewLink(handler);
    this.onRemoveLink(handler);
  }
  public onNewNode(handler: (data: GraphNode) => unknown) {
    this.handlers.newNode.push(handler);
  }
  public onNewLink(handler: (data: GraphLink) => unknown) {
    this.handlers.newLink.push(handler);
  }
  public onRemoveNode(handler: (data: GraphNode) => unknown) {
    this.handlers.removeNode.push(handler);
  }
  public onRemoveLink(handler: (data: GraphLink) => unknown) {
    this.handlers.removeLink.push(handler);
  }

  private emit<K extends keyof GraphEventHandlers>(
    eventName: K,
    eventPayload: Parameters<GraphEventHandlers[K][number]>[0]
  ): void {
    const eventHandlers = this.handlers[eventName];
    if (eventHandlers.length > 0) {
      eventHandlers.forEach(handler => {
        try {
          handler(eventPayload as any);
        } catch (error) {
          console.error(`Error in ${String(eventName)} handler:`, error);
        }
      });
    }
  }

  /**
   * Clears all nodes and links from the graph.
   */
  public clear() {
    this.nodes.clear();
    this.links.clear();

    this.nextNodeId = 0;
    this.nextLinkId = 0;
  }

  // Node Management

  /**
   * Adds a new node to the graph with its data. An ID will be automatically generated.
   * @param nodeData The data for the new node. This object will be merged with the node's ID and connectedLinkIds.
   * @returns The newly created GraphNode object, or null if an error occurred.
   */
  public addNode(nodeData: Record<string, any>): GraphNode | null {
    const nodeId = this.nextNodeId++;
    const newNode: GraphNode = { id: nodeId, connectedLinkIds: new Set(), ...nodeData };

    if (this.nodes.has(nodeId)) {
      console.error(`Generated duplicate Node ID ${nodeId}. This is unexpected.`);
      return null;
    }

    this.nodes.set(nodeId, newNode);
    this.emit('newNode', newNode);
    return newNode;
  }

  /**
   * Retrieves the complete node object (including data and connected link IDs).
   * @param nodeId The ID of the node.
   * @returns The GraphNode object, or undefined if the node doesn't exist.
   */
  public getNode(nodeId: NodeId): GraphNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Removes a node from the graph, including all its connected links.
   * @param nodeId The ID of the node to remove.
   * @returns True if the node was removed successfully, false otherwise.
   */
  public removeNode(nodeId: NodeId): boolean {
    const nodeToRemove = this.nodes.get(nodeId);
    if (!nodeToRemove) {
      console.warn(`Node with ID ${nodeId} not found for removal.`);
      return false;
    }

    // Remove all links connected to this node
    // Create a copy of connectedLinkIds because removeLink modifies the set
    const linkIdsToRemove = Array.from(nodeToRemove.connectedLinkIds);
    linkIdsToRemove.forEach(linkId => this.removeLink(linkId));

    this.nodes.delete(nodeId);
    this.emit('removeNode', nodeToRemove);
    return true;
  }

  // Link Management

  /**
   * Adds a new link to the graph. An ID will be automatically generated.
   * @param sourceId The ID of the source node.
   * @param targetId The ID of the target node.
   * @param linkData The data for the new link.
   * @returns The newly created GraphLink object, or null if an error occurred.
   */
  public addLink(sourceId: NodeId, targetId: NodeId, linkData: Record<string, any>): GraphLink | null {
    const linkId = this.nextLinkId++;
    const sourceNode = this.nodes.get(sourceId);
    const targetNode = this.nodes.get(targetId);

    if (!sourceNode) {
      console.warn(`Source node with ID ${sourceId} not found for link creation.`);
      return null;
    }
    if (!targetNode) {
      console.warn(`Target node with ID ${targetId} not found for link creation.`);
      return null;
    }

    const newLink: GraphLink = {
      id: linkId,
      source: sourceNode, // Store the reference to the source node
      target: targetNode, // Store the reference to the target node
      ...linkData,
    };

    if (this.links.has(linkId)) {
      console.error(`Generated duplicate Link ID ${linkId}. This is unexpected.`);
      return null;
    }

    this.links.set(linkId, newLink);

    // Update connectedLinkIds for both source and target nodes
    sourceNode.connectedLinkIds.add(linkId);
    targetNode.connectedLinkIds.add(linkId);

    this.emit('newLink', newLink);
    return newLink;
  }

  /**
   * Retrieves the complete link object (including data).
   * @param linkId The ID of the link.
   * @returns The GraphLink object, or undefined if the link doesn't exist.
   */
  public getLink(linkId: LinkId): GraphLink | undefined {
    return this.links.get(linkId);
  }

  /**
   * Removes a link from the graph.
   * @param linkId The ID of the link to remove.
   * @returns True if the link was removed successfully, false otherwise.
   */
  public removeLink(linkId: LinkId): boolean {
    const linkToRemove = this.links.get(linkId);
    if (!linkToRemove) {
      console.warn(`Link with ID ${linkId} not found for removal.`);
      return false;
    }

    // Remove link from source and target nodes' connectedLinkIds
    // We can directly access source and target nodes via the link object
    const sourceNode = this.nodes.get(linkToRemove.source.id);
    if (sourceNode) {
      sourceNode.connectedLinkIds.delete(linkId);
    }
    const targetNode = this.nodes.get(linkToRemove.target.id);
    if (targetNode) {
      targetNode.connectedLinkIds.delete(linkId);
    }

    this.links.delete(linkId);
    this.emit('removeLink', linkToRemove);
    return true;
  }

  // Accessing Graph Structure

  public getLinksForNode(nodeId: NodeId): GraphLink[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }

    const connectedLinks: GraphLink[] = [];
    for (const linkId of node.connectedLinkIds) {
      const link = this.links.get(linkId);
      if (link) {
        connectedLinks.push(link);
      }
    }
    return connectedLinks;
  }

  public getNeighbors(nodeId: NodeId): GraphNode[] {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return [];
    }

    const neighbors: GraphNode[] = [];
    for (const linkId of node.connectedLinkIds) {
      const link = this.links.get(linkId);
      if (link) {
        if (link.source.id === nodeId) {
          neighbors.push(link.target);
        } else if (link.target.id === nodeId) {
          neighbors.push(link.source);
        }
      }
    }
    return neighbors;
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllLinks(): GraphLink[] {
    return Array.from(this.links.values());
  }

  /**
   * Transforms the current graph data into a serializable object format.
   * This format is suitable for JSON serialization and matches the constructor's input.
   * @returns An object containing arrays of serializable nodes and links.
   */
  public exportGraph(): { nodes: SerializableNode[]; links: SerializableLink[] } {
    const exportedNodes: SerializableNode[] = [];
    for (const node of this.nodes.values()) {
      // Destructure to omit 'connectedLinkIds' which is internal
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { connectedLinkIds, ...nodeData } = node;
      exportedNodes.push(nodeData);
    }

    const exportedLinks: SerializableLink[] = [];
    for (const link of this.links.values()) {
      // Destructure to omit 'source' and 'target' GraphNode references,
      // and replace them with just their NodeIds
      const { source, target, ...linkData } = link;
      exportedLinks.push({
        ...linkData,
        source: source.id,
        target: target.id,
      });
    }

    return {
      nodes: exportedNodes,
      links: exportedLinks,
    };
  }
}

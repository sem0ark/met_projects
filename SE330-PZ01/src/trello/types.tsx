export interface BoardData {
  lanes: Lane[];
}

export interface Lane {
  id: string;
  title?: string;
  label?: string;
  style?: string;
  cards: Card[];
  currentPage?: number;
  droppable?: boolean;
  labelStyle?: string;
  cardStyle?: string;
  disallowAddingCard?: boolean;
}

export interface Card {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  laneId?: string;
  style?: string;
  draggable?: boolean;
}

export type BoardComponents = {
  GlobalStyle: React.FC;
  BoardWrapper: React.FC<React.PropsWithChildren<{ className?: string }>>;
  LaneHeader: React.FC<any>; // You might want to refine this with actual LaneHeader props
  ScrollableLane: React.FC<
    React.PropsWithChildren<{ isDraggingOver: boolean }>
  >;
  AddCardLink: React.FC<{
    onClick: () => void;
    t: (key: string) => string;
    laneId: string;
  }>;
  NewCardForm: React.FC<{
    onCancel: () => void;
    t: (key: string) => string;
    laneId: string;
    onAdd: (params: any) => void;
  }>;
  NewLaneSection: React.FC<{ onClick: () => void; t: (key: string) => string }>;
  NewLaneForm: React.FC<{
    onCancel: () => void;
    onAdd: (params: any) => void;
    t: (key: string) => string;
  }>;
  LaneFooter: React.FC<{ onClick: () => void; collapsed: boolean }>;
  Card: React.FC<
    Card & {
      index: number;
      className: string;
      onDelete: () => void;
      onClick: (e: React.MouseEvent, card: Card) => void;
      onChange: (updatedCard: Partial<Card> & Pick<Card, "id">) => void;
      showDeleteButton: boolean;
      tagStyle?: React.CSSProperties;
      cardDraggable: boolean;
      editable: boolean;
      t: (key: string) => string;
    }
  >;
  Loader: React.FC;
};

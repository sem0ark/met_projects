import clsx from "clsx";

import {
  useQuery_FetchCategories,
  useQuery_FetchCategory,
  useQuery_FetchProducts,
} from "../data/queries";
import { Product } from "../data/types";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownIcon, ArrowUpIcon, Spinner } from "../components/icons";
import { CategoryTag } from "../components/buttons";
import { HashTagIcon } from "../components/icons";
import { useState } from "react";

const ProductCard = ({ product }: { product: Product }) => {
  return (
    <div className="relative flex w-40 max-w-40 flex-col gap-2 rounded-md shadow-md">
      <div className="relative h-40 w-40 overflow-hidden rounded-md">
        {/* Allows to keep the size of the card while the image is loading, good for keeping Cumulative Layout Shift small */}
        <div className="absolute inset-0 -z-10 flex h-40 w-40 items-center justify-center">
          <Spinner />
        </div>

        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-40 min-w-40 overflow-hidden rounded-md bg-center duration-300 ease-in-out hover:scale-110"
        />

        <Link
          to={`/products/${product.id}`}
          className="tansition-all absolute inset-0 flex h-full w-full cursor-pointer flex-col items-center justify-center text-center opacity-0 duration-300 ease-in-out hover:opacity-100 hover:backdrop-blur-sm"
        >
          <div className="font-bold">See Details</div>
        </Link>
      </div>

      <div
        className={clsx(
          product.categoryIds.length <= 1 ? "justify-center" : "justify-start",
          "no-scrollbar flex h-5 w-full flex-row flex-nowrap gap-2 overflow-scroll px-2",
        )}
      >
        {product.categoryIds.map((id) => (
          <CategoryTag id={id} key={id} />
        ))}
      </div>

      <p className="overflow-hidden text-ellipsis text-center text-base">
        {product.name}
      </p>

      <p className="max-h-15 overflow-hidden px-2 text-center text-xs text-neutral-600">
        {product.description.split(" ").splice(0, 10).join(" ")}...
      </p>
      <div className="flex-1"></div>

      <p className="text-center text-base">
        {(product.price * 1.0).toFixed(2)} RSD
      </p>

      <Link
        to={`/products/${product.id}`}
        className="w-full cursor-pointer rounded-b-md bg-accent-500 text-center text-base text-white duration-200 ease-in-out hover:bg-accent-100"
      >
        Buy
      </Link>
    </div>
  );
};

const CategoryHeading = ({ id }: { id: string }) => {
  const { data, isSuccess } = useQuery_FetchCategory(id);
  return (
    isSuccess && (
      <div className="flex h-10 cursor-pointer flex-row items-center text-nowrap rounded-full px-2 text-2xl transition-colors duration-300 ease-in-out">
        <HashTagIcon className="h-8" />
        {data.name}
      </div>
    )
  );
};

const sortFunctions: Record<
  string,
  { func: (a: Product, b: Product) => number; name: string }
> = {
  id: {
    name: "ID",
    func: (a, b) => a.id.localeCompare(b.id),
  },
  name: {
    name: "Name",
    func: (a, b) => a.name.localeCompare(b.name),
  },
  price: {
    name: "Price",
    func: (a, b) => a.price - b.price,
  },
};

const Sorter = ({
  setSortFunction,
  currentSortFunction,
  sortFunction,
  sortFunctionName,
  setAscending,
  ascending,
}: {
  setSortFunction: (newKey: keyof typeof sortFunctions) => void;
  currentSortFunction: keyof typeof sortFunctions;
  sortFunction: keyof typeof sortFunctions;
  sortFunctionName: string;
  setAscending: (asc: boolean) => void;
  ascending: boolean;
}) => (
  <button
    className={clsx(
      "flex w-24 items-center gap-1 rounded-full p-1",
      sortFunction === currentSortFunction &&
        "border-2 border-accent-200 bg-accent-500 text-white",
    )}
    onClick={() =>
      sortFunction === currentSortFunction
        ? setAscending(!ascending)
        : setSortFunction(sortFunction)
    }
  >
    {sortFunction === currentSortFunction &&
      (ascending ? (
        <ArrowUpIcon className="h-5" />
      ) : (
        <ArrowDownIcon className="h-5" />
      ))}
    <div className="flex-1 text-center font-bold">{sortFunctionName}</div>
  </button>
);

const Sorters = ({
  setSortFunction,
  setAscending,
  sortFunction,
  ascending,
}: {
  setSortFunction: (newKey: keyof typeof sortFunctions) => void;
  sortFunction: keyof typeof sortFunctions;
  setAscending: (asc: boolean) => void;
  ascending: boolean;
}) => {
  return (
    <div className="flex w-full justify-center gap-2">
      {Object.entries(sortFunctions).map(([name, v]) => (
        <Sorter
          setSortFunction={setSortFunction}
          currentSortFunction={sortFunction}
          sortFunction={name}
          sortFunctionName={v.name}
          setAscending={setAscending}
          ascending={ascending}
        />
      ))}
    </div>
  );
};

const Filters = ({
  setPriceRegion,
}: {
  setPriceRegion: (v: [number, number] | null) => void;
}) => {
  const { data: categories } = useQuery_FetchCategories();
  const className =
    "flex h-5 w-fit cursor-pointer flex-row items-center text-nowrap rounded-full border-2 border-accent-600 bg-accent-600 px-2 text-xs text-white transition-colors duration-300 ease-in-out hover:bg-accent-300";

  return (
    <>
      {categories && (
        <div className="flex w-full flex-wrap justify-center gap-2">
          <Link
            to={`/products`}
            className="flex h-5 w-fit cursor-pointer flex-row items-center text-nowrap rounded-full border-2 border-accent-600 bg-accent-600 px-2 text-xs text-white transition-colors duration-300 ease-in-out hover:bg-accent-300"
          >
            <div className="text-nowrap">All</div>
          </Link>

          {categories.map(({ id }) => (
            <CategoryTag id={id} key={id} />
          ))}
        </div>
      )}

      <div className="flex w-full flex-wrap justify-center gap-2">
        <button onClick={() => setPriceRegion(null)} className={className}>
          Any Price
        </button>
        <button onClick={() => setPriceRegion([0, 100])} className={className}>
          0 - 100 RSD
        </button>
        <button
          onClick={() => setPriceRegion([100, 300])}
          className={className}
        >
          200 - 300 RSD
        </button>
        <button
          onClick={() => setPriceRegion([300, 800])}
          className={className}
        >
          300 - 800 RSD
        </button>
        <button
          onClick={() => setPriceRegion([1000, 99999])}
          className={className}
        >
          over 1000 RSD
        </button>
      </div>
    </>
  );
};

export function Products() {
  const [searchParams] = useSearchParams();
  const { data, isLoading, isError, error } = useQuery_FetchProducts();
  const [sortFunction, setSortFunction] =
    useState<keyof typeof sortFunctions>();
  const [ascending, setAscending] = useState(true);
  const [priceRegion, setPriceRegion] = useState<[number, number] | null>();
  const [search, setSearch] = useState<string>("");

  if (isError) throw error;
  if (isLoading)
    return (
      <div className="absolute inset-0 flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );

  const categoryIdParam = searchParams.get("categoryId");
  const filteredByCategory = categoryIdParam
    ? data?.filter((it) => it.categoryIds.includes(categoryIdParam))
    : data;

  const filteredByPrice = priceRegion
    ? filteredByCategory?.filter(
        (it) => priceRegion[0] <= it.price && it.price <= priceRegion[1],
      )
    : filteredByCategory;

  const filteredBySearch = search
    ? filteredByPrice?.filter(
        (it) => it.name.toLowerCase().includes(search.toLowerCase()),
      )
    : filteredByPrice;


  const sorted = sortFunction
    ? filteredBySearch?.sort(
        (a, b) => (ascending ? 1 : -1) * sortFunctions[sortFunction].func(a, b),
      )
    : filteredBySearch;

  return (
    <div className="flex flex-col gap-5 items-center">
      <input type="text" onInput={(e) => setSearch((e.target as HTMLInputElement).value)} placeholder="Search" className="w-full max-w-lg border-2 rounded-full outline-none focus:border-accent-500 px-5 py-1" />

      {!!categoryIdParam && (
        <div className="mb-10 flex w-full items-center justify-center">
          <CategoryHeading id={categoryIdParam} />
        </div>
      )}

      <Sorters
        setSortFunction={setSortFunction}
        setAscending={setAscending}
        sortFunction={sortFunction || "id"}
        ascending={ascending}
      />

      <Filters setPriceRegion={setPriceRegion} />

      <div className="flex flex-wrap justify-center gap-5 px-5">
        {sorted?.map((product) => (
          <ProductCard product={product} key={product.id} />
        )) || "No Products..."}
      </div>
    </div>
  );
}

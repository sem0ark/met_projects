import { Link } from "react-router-dom";
import { useQuery_FetchCategory } from "../data/queries";
import { HashTagIcon } from "./icons";
import { Button } from "@headlessui/react";

export const CategoryTag = ({ id }: { id: number }) => {
  const { data, isSuccess } = useQuery_FetchCategory(id);
  return (
    isSuccess && (
      <Link
        to={`/products?categoryId=${id}`}
        className="flex h-5 w-fit cursor-pointer flex-row items-center text-nowrap rounded-full border-2 border-accent-600 bg-accent-600 px-2 text-xs text-white transition-colors duration-300 ease-in-out hover:bg-accent-300"
      >
        <HashTagIcon className="h-4" />
        <div className="text-nowrap">{data.name}</div>
      </Link>
    )
  );
};

export const CategoryTagButton = ({
  id,
  onClick,
}: {
  id: number;
  onClick: () => void;
}) => {
  const { data, isSuccess } = useQuery_FetchCategory(id);
  return (
    isSuccess && (
      <Button
        onClick={onClick}
        className="flex h-5 w-fit cursor-pointer flex-row items-center text-nowrap rounded-full border-2 border-accent-600 bg-accent-600 px-2 text-xs text-white transition-colors duration-300 ease-in-out hover:bg-accent-300"
      >
        <HashTagIcon className="h-4" />
        <div className="text-nowrap">{data.name}</div>
      </Button>
    )
  );
};

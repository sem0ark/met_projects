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
        className="border-orange-600 bg-orange-600 hover:bg-orange-300 flex h-5 w-fit cursor-pointer flex-row items-center rounded-full border-2 px-2 text-xs text-nowrap text-white transition-colors duration-300 ease-in-out"
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
        className="border-orange-600 bg-orange-600 hover:bg-orange-300 flex h-5 w-fit cursor-pointer flex-row items-center rounded-full border-2 px-2 text-xs text-nowrap text-white transition-colors duration-300 ease-in-out"
      >
        <HashTagIcon className="h-4" />
        <div className="text-nowrap">{data.name}</div>
      </Button>
    )
  );
};

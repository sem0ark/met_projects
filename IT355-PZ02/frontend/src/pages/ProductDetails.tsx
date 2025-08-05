import { useLoaderData, useNavigate } from "react-router-dom";
import { useQuery_FetchProduct } from "../data/queries";
import { Spinner } from "../components/icons";
import { useEffect, useState } from "react";
import { Button } from "@headlessui/react";
import clsx from "clsx";
import { ArrowLeftIcon, ArrowRightIcon } from "../components/icons";
import { type Product } from "../data/types";
import { useUserStore } from "../stores/user";
import { CategoryTag } from "../components/buttons";
import { useIsLoggedInAsUser } from "../data/auth";

function useRange<T>(items: T[], initial = 0) {
  const [index, setIndex] = useState(initial);
  const l = items.length;

  return {
    item: items[index],
    prev: items[index === 0 ? l - 1 : index - 1],
    setIndex: setIndex,
    setPrev: () => setIndex((c) => (c - 1 < 0 ? l - 1 : c - 1)),
    setNext: () => setIndex((c) => (c + 1 >= l ? 0 : c + 1)),
  };
}

const Slider = ({ imageUrls }: { imageUrls: string[] }) => {
  const { item: image, setNext, setPrev, setIndex } = useRange(imageUrls);

  useEffect(() => {
    const tm = setTimeout(setNext, 2000);
    return () => clearTimeout(tm);
  }, [setNext, image]);

  return (
    <div className="flex w-96 flex-1 flex-col justify-center gap-5">
      <div className="relative w-96 overflow-hidden rounded-lg shadow-md">
        <div className="h-96 w-96">
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <Spinner />
          </div>

          <img src={image} alt={image} className="rounded-lg object-center" />
        </div>

        <div
          className={clsx(
            imageUrls.length > 1 ? "inline-block" : "hidden",
            "absolute top-1/2 left-0 translate-x-1/2 -translate-y-1/2 transform",
          )}
        >
          <ArrowLeftIcon className="pointer-events-none h-10 animate-ping border-none text-white/20" />
        </div>
        <div
          className={clsx(
            imageUrls.length > 1 ? "inline-block" : "hidden",
            "absolute top-1/2 right-0 -translate-x-1/2 -translate-y-1/2 transform",
          )}
        >
          <ArrowRightIcon className="pointer-events-none h-10 animate-ping border-none text-white/20" />
        </div>

        <Button
          onClick={setPrev}
          className={clsx(
            imageUrls.length > 1 ? "inline-block" : "hidden",
            "absolute top-1/2 left-0 translate-x-1/2 -translate-y-1/2 transform",
          )}
        >
          <ArrowLeftIcon className="h-10 rounded-full border-2 border-white text-white transition-colors duration-300 hover:bg-white hover:text-black" />
        </Button>
        <Button
          onClick={setNext}
          className={clsx(
            imageUrls.length > 1 ? "inline-block" : "hidden",
            "absolute top-1/2 right-0 -translate-x-1/2 -translate-y-1/2 transform",
          )}
        >
          <ArrowRightIcon className="h-10 rounded-full border-2 border-white text-white transition-colors duration-300 hover:bg-white hover:text-black" />
        </Button>
      </div>

      <div className="flex w-96 justify-evenly">
        {imageUrls.map((url, i) => (
          <div
            key={i}
            className={clsx(
              "inline-flex h-10 w-10 overflow-hidden rounded-full border-2 transition duration-300 ease-in-out",
              image === url
                ? "border-orange-400"
                : "hover:border-orange-400 border-white",
            )}
            onClick={() => setIndex(i)}
          >
            <img
              src={url}
              alt={url}
              className={clsx(
                "object-center transition duration-300 ease-in-out",
                image === url
                  ? "brightness-100"
                  : "brightness-75 hover:brightness-100",
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductInfo = ({ product }: { product: Product }) => {
  const addItem = useUserStore((state) => state.addItem);
  const isLoggedIn = useIsLoggedInAsUser();
  const navigate = useNavigate();

  return (
    <div className="flex w-full flex-1 flex-col gap-5">
      <h1 className="text-xl">{product.name}</h1>
      <p className="text-lg font-bold">
        {(product.price * 1.0).toFixed(2)} RSD
      </p>
      <div className="no-scrollbar flex w-full flex-row flex-nowrap items-center gap-2 overflow-scroll">
        {product.categoryIds.map((id) => (
          <CategoryTag id={id} key={id} />
        ))}
      </div>

      <Button
        className="bg-orange-600 active:bg-orange-200 mt-10 h-10 w-full rounded-full text-white sm:w-40"
        onClick={() => (isLoggedIn ? addItem(product, 1) : navigate("/login"))}
      >
        Add to Cart
      </Button>

      <hr />

      <p className="w-full text-lg text-neutral-600">{product.description}</p>

      <p className="w-full">{product.descriptionLong}</p>
    </div>
  );
};

export function ProductDetails() {
  const { productId } = useLoaderData() as { productId: number };
  const {
    data: productData,
    isLoading,
    isError,
    error,
  } = useQuery_FetchProduct(productId);

  if (isError) {
    throw error;
  }

  if (isLoading)
    return (
      <div className="absolute inset-0 flex h-full min-h-[80vh] w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-5 px-5 sm:flex-row sm:items-start">
      <Slider imageUrls={productData?.imageUrls || []}></Slider>
      {productData && <ProductInfo product={productData} />}
    </div>
  );
}

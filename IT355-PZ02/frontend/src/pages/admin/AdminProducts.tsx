import { Spinner } from "../../components/icons";
import {
  useQuery_AddProduct,
  useQuery_DeleteProduct,
  useQuery_FetchCategories,
  useQuery_FetchProduct,
  useQuery_FetchProducts,
  useQuery_PutProduct,
} from "../../data/queries";
import { CategoryTag, CategoryTagButton } from "../../components/buttons";
import { type Product } from "../../data/types";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { ErrorText } from "../../components/forms";

interface IFormDataProduct {
  name: string;
  price: number;
  description: string;
  descriptionLong: string;
  categoryIds: number[];
}

const ProductForm = ({
  product,
  onSubmit,
  cancelEditing,
  isPending,
}: {
  product: IFormDataProduct;
  onSubmit: SubmitHandler<IFormDataProduct>;
  cancelEditing: () => void;
  isPending: boolean;
}) => {
  const { data: categories } = useQuery_FetchCategories();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IFormDataProduct>({
    defaultValues: { ...product },
  });

  const [productCategories, setProductCategories] = useState<number[]>([
    ...product.categoryIds,
  ]);

  useEffect(() => {
    setValue("categoryIds", productCategories);
  }, [productCategories, setValue]);

  const categoriesFiltered =
    categories &&
    categories.filter(({ id }) => !productCategories.includes(id));

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full w-full flex-col gap-2"
    >
      <input
        {...register("name", {
          required: true,
          validate: (s) => s.trim().length > 0,
        })}
        type="text"
        className="w-48 max-w-lg overflow-hidden text-xl text-wrap"
        placeholder="Enter Name"
      />
      {<ErrorText message={errors?.name && "Please, enter product name."} />}

      <input
        {...register("price", {
          required: {
            value: true,
            message: "Please, enter price.",
          },
          min: {
            value: 1.0,
            message: "Price should be at least 1.0 RSD.",
          },
        })}
        type="number"
        className="w-48 text-lg font-bold"
        step={".01"}
      />
      {<ErrorText message={errors?.price?.message} />}

      <div className="flex gap-2">
        {!!categoriesFiltered && categoriesFiltered.length > 0 && (
          <Popover className="block">
            <PopoverButton className="block w-full rounded-md ring-transparent hover:font-bold">
              Add Category
            </PopoverButton>

            <PopoverPanel
              transition
              anchor="bottom"
              className="top-9 z-20 flex flex-col items-center gap-2 rounded-xl border-2 bg-orange-50 p-5 text-sm/6 transition duration-200 ease-in-out [--anchor-gap:var(--spacing-5)] data-[closed]:-translate-y-1 data-[closed]:opacity-0"
            >
              {categoriesFiltered &&
                categoriesFiltered.map(({ id }) => (
                  <CategoryTagButton
                    id={id}
                    key={`${id}-button`}
                    onClick={() => setProductCategories((c) => [...c, id])}
                  />
                ))}
            </PopoverPanel>
          </Popover>
        )}

        {productCategories.map((id) => (
          <CategoryTagButton
            id={id}
            key={id}
            onClick={() =>
              setProductCategories((c) => c.filter((cid) => cid !== id))
            }
          />
        ))}
      </div>

      <textarea
        {...register("description", {
          required: true,
          validate: (s) => s.trim().length > 0,
        })}
        className="w-full max-w-lg overflow-hidden text-base text-wrap text-neutral-600"
        placeholder="Enter Description"
      />
      {
        <ErrorText
          message={errors?.description && "Please, enter description."}
        />
      }

      <textarea
        {...register("descriptionLong", {
          required: true,
          validate: (s) => s.trim().length > 0,
        })}
        className="w-full max-w-lg overflow-hidden text-sm text-wrap text-neutral-600"
        placeholder="Enter Full Description"
      />
      {
        <ErrorText
          message={errors?.descriptionLong && "Please, enter full description."}
        />
      }

      <button
        className="rounded-md bg-orange-500 px-5 text-base font-bold text-white hover:brightness-125"
        type="submit"
        disabled={isPending}
      >
        Save Changes
      </button>

      <button
        className="absolute top-0 right-0 rounded-md bg-red-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
        onClick={cancelEditing}
        disabled={isPending}
      >
        Cancel
      </button>
    </form>
  );
};

const ProductCreateForm = ({
  cancelEditing,
}: {
  cancelEditing: () => void;
}) => {
  const { mutate: createProduct, isPending } = useQuery_AddProduct();

  const onSubmit: SubmitHandler<IFormDataProduct> = (data) => {
    createProduct({
      name: data.name,
      price: data.price,
      description: data.description,
      descriptionLong: data.descriptionLong,
      categoryIds: data.categoryIds,
      imageUrls: [
        "https://picsum.photos/800?random=1",
        "https://picsum.photos/800?random=2",
        "https://picsum.photos/800?random=3",
      ],
    });
    cancelEditing();
  };

  return (
    <ProductForm
      isPending={isPending}
      product={{
        name: "",
        price: 0,
        description: "",
        descriptionLong: "",
        categoryIds: [],
      }}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const ProductEditForm = ({
  product,
  cancelEditing,
}: {
  product: Product;
  cancelEditing: () => void;
}) => {
  const { mutate: updateProduct, isPending } = useQuery_PutProduct(product.id);
  const { data: productFull } = useQuery_FetchProduct(product.id);

  const onSubmit: SubmitHandler<IFormDataProduct> = (data) => {
    updateProduct({
      ...product,
      name: data.name,
      price: data.price,
      description: data.description,
      descriptionLong: data.descriptionLong,
      categoryIds: data.categoryIds,
    });
    cancelEditing();
  };

  return (
    <ProductForm
      isPending={isPending}
      product={{
        ...product,
        descriptionLong: productFull?.descriptionLong ?? "",
        ...productFull,
      }}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const ProductInfo = ({
  product,
  setEditing,
}: {
  product: Product;
  setEditing: () => void;
}) => {
  const { mutate: deleteProduct, isPending } = useQuery_DeleteProduct(
    product.id,
  );
  const { data: productFull } = useQuery_FetchProduct(product.id);

  return (
    <div className="flex h-full flex-1 flex-col gap-2">
      <p className="max-w-lg overflow-hidden text-xl text-wrap">
        {product.name}
      </p>

      <p className="text-lg font-bold">{product.price} RSD</p>

      <div className="no-scrollbar flex h-5 w-full flex-row flex-nowrap justify-start gap-2 overflow-scroll">
        {product.categoryIds.map((id) => (
          <CategoryTag id={id} key={`${id}-link`} />
        ))}
      </div>

      <p className="max-h-15 max-w-lg overflow-hidden text-base text-wrap text-neutral-600">
        {product.description}
      </p>

      <p className="max-h-15 max-w-lg overflow-hidden text-sm text-wrap text-neutral-600">
        {product.descriptionLong ?? productFull?.descriptionLong}
      </p>

      <div className="absolute top-0 right-0 flex flex-col gap-2">
        <button
          className="rounded-md bg-orange-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={setEditing}
          disabled={isPending}
        >
          Edit
        </button>

        <button
          className="rounded-md bg-red-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={() => deleteProduct()}
          disabled={isPending}
        >
          Remove
        </button>
      </div>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative flex w-full gap-5 rounded-md">
      <div className="h-full w-40">
        <div className="relative h-40 w-40 overflow-hidden rounded-md">
          <div className="absolute inset-0 -z-10 flex h-40 w-40 items-center justify-center">
            <Spinner />
          </div>

          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-40 min-w-40 overflow-hidden rounded-md bg-center duration-300 ease-in-out hover:scale-110"
          />
        </div>
      </div>

      {isEditing ? (
        <ProductEditForm
          product={product}
          cancelEditing={() => setIsEditing(false)}
        />
      ) : (
        <ProductInfo product={product} setEditing={() => setIsEditing(true)} />
      )}
    </div>
  );
};

export const AdminProducts = () => {
  const { data, isLoading, isError, error } = useQuery_FetchProducts();
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  if (isError) throw error;

  if (isLoading)
    return (
      <div className="absolute inset-0 flex h-full min-h-[80vh] w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex w-full flex-col justify-center gap-5 px-5">
      {!isAddingProduct ? (
        <button
          className="rounded-md bg-orange-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={() => setIsAddingProduct(true)}
        >
          Add New Product
        </button>
      ) : (
        <ProductCreateForm cancelEditing={() => setIsAddingProduct(false)} />
      )}

      {data?.map((product) => (
        <ProductCard product={product} key={product.id} />
      )) || "No Products..."}
    </div>
  );
};

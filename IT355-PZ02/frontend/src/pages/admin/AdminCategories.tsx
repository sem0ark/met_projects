import { ErrorText } from "../../components/forms";
import { Spinner } from "../../components/icons";
import {
  useQuery_AddCategory,
  useQuery_DeleteCategory,
  useQuery_FetchCategories,
  useQuery_PutCategory,
} from "../../data/queries";
import { type Category } from "../../data/types";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

interface IFormDataCategory {
  name: string;
}

const CategoryForm = ({
  category,
  onSubmit,
  cancelEditing,
  isPending,
}: {
  category: IFormDataCategory;
  onSubmit: SubmitHandler<IFormDataCategory>;
  cancelEditing: () => void;
  isPending: boolean;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataCategory>({
    defaultValues: { ...category },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full w-full gap-2"
    >
      <div className="w-full max-w-lg overflow-hidden text-xl text-wrap">
        <input
          {...register("name", {
            required: {
              value: true,
              message: "Please, enter category name.",
            },
          })}
          type="text"
          className="w-full"
        />
        {<ErrorText message={errors?.name?.message} />}
      </div>

      <div className="flex-1"></div>

      <button
        className="rounded-md bg-orange-500 px-5 text-base font-bold text-white hover:brightness-125"
        type="submit"
        disabled={isPending}
      >
        Save Changes
      </button>

      <button
        className="rounded-md bg-red-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
        onClick={cancelEditing}
        disabled={isPending}
      >
        Cancel
      </button>
    </form>
  );
};

const CategoryCreateForm = ({
  cancelEditing,
}: {
  cancelEditing: () => void;
}) => {
  const { mutate: createCategory, isPending } = useQuery_AddCategory();

  const onSubmit: SubmitHandler<IFormDataCategory> = (data) => {
    createCategory({
      name: data.name.trim(),
    });
    cancelEditing();
  };

  return (
    <CategoryForm
      isPending={isPending}
      category={{
        name: "Default Category Name",
      }}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const CategoryEditForm = ({
  category,
  cancelEditing,
}: {
  category: Category;
  cancelEditing: () => void;
}) => {
  const { mutate: updateProduct, isPending } = useQuery_PutCategory(
    category.id,
  );

  const onSubmit: SubmitHandler<IFormDataCategory> = (data) => {
    updateProduct({ name: data.name.trim() });
    cancelEditing();
  };

  return (
    <CategoryForm
      isPending={isPending}
      category={category}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const CategoryInfo = ({
  category,
  setEditing,
}: {
  category: Category;
  setEditing: () => void;
}) => {
  const { mutate: deleteProduct, isPending } = useQuery_DeleteCategory(
    category.id,
  );

  return (
    <div className="flex w-full flex-row gap-2">
      <p className="max-w-lg overflow-hidden text-xl text-wrap">
        {category.name}
      </p>

      <div className="flex-1"></div>

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
  );
};

const CategoryCard = ({ category }: { category: Category }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative flex w-full gap-5 rounded-md">
      {isEditing ? (
        <CategoryEditForm
          category={category}
          cancelEditing={() => setIsEditing(false)}
        />
      ) : (
        <CategoryInfo
          category={category}
          setEditing={() => setIsEditing(true)}
        />
      )}
    </div>
  );
};

export const AdminCategories = () => {
  const { data, isLoading, isError, error } = useQuery_FetchCategories();
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  if (isError) throw error;

  if (isLoading)
    return (
      <div className="absolute inset-0 flex h-full min-h-[80vh] w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex w-full flex-col justify-center gap-5 px-5">
      {!isAddingCategory ? (
        <button
          className="rounded-md bg-orange-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={() => setIsAddingCategory(true)}
        >
          Add New Category
        </button>
      ) : (
        <CategoryCreateForm cancelEditing={() => setIsAddingCategory(false)} />
      )}

      {data?.map((category) => (
        <CategoryCard category={category} key={category.id} />
      )) || "No Categories..."}
    </div>
  );
};

import { Spinner } from "../../components/icons";
import {
  useQuery_AddUser,
  useQuery_DeleteUser,
  useQuery_FetchUsers,
  useQuery_PutUser,
} from "../../data/queries";
import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { type User } from "../../data/types";
import { ErrorText } from "../../components/forms";
import { useUser } from "../../data/auth";

interface IFormDataUser {
  username: string;
  password: string;
}

const UserForm = ({
  user,
  onSubmit,
  cancelEditing,
  isPending,
}: {
  user: { username: string };
  onSubmit: SubmitHandler<IFormDataUser>;
  cancelEditing: () => void;
  isPending: boolean;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormDataUser>({
    defaultValues: { ...user, password: "" },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex h-full w-full items-center gap-2"
    >
      <div className="h-full max-w-lg flex-1 flex-col gap-2 overflow-hidden text-xl text-wrap">
        <input
          placeholder="Enter a name"
          {...register("username", {
            required: {
              value: true,
              message: "Please, enter username.",
            },
            pattern: {
              value: /[^\s]/,
              message: "Username should not contain whitespace.",
            },
            minLength: {
              value: 3,
              message: "Username should be at least 3 characters long.",
            },
          })}
          type="text"
          className="w-full"
        />
        {<ErrorText message={errors?.username?.message} />}
      </div>

      <div className="h-full max-w-lg flex-1 flex-col gap-2 overflow-hidden text-xl text-wrap">
        <input
          placeholder="Enter a password"
          {...register("password", {
            minLength: {
              value: 4,
              message: "Password should be at least 4 characters long.",
            },
            required: {
              value: true,
              message: "Password is required.",
            },
          })}
          type="text"
          className="w-full"
        />
        {<ErrorText message={errors?.password?.message} />}
      </div>

      <button
        className="h-full rounded-md bg-orange-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
        type="submit"
        disabled={isPending}
      >
        Save Changes
      </button>

      <button
        className="h-full rounded-md bg-red-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
        onClick={cancelEditing}
        disabled={isPending}
      >
        Cancel
      </button>
    </form>
  );
};

const UserCreateForm = ({ cancelEditing }: { cancelEditing: () => void }) => {
  const { mutate: createUser, isPending } = useQuery_AddUser();

  const onSubmit: SubmitHandler<IFormDataUser> = (data) => {
    createUser({
      username: data.username.trim(),
      password: data.password.trim(),
    });
    cancelEditing();
  };

  return (
    <UserForm
      isPending={isPending}
      user={{
        username: "",
      }}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const UserEditForm = ({
  user,
  cancelEditing,
}: {
  user: User;
  cancelEditing: () => void;
}) => {
  const { mutate: updateUser, isPending } = useQuery_PutUser(user.id);

  const onSubmit: SubmitHandler<IFormDataUser> = (data) => {
    updateUser({
      ...user,
      username: data.username.trim(),
      password: data.password.trim(),
    });
    cancelEditing();
  };

  return (
    <UserForm
      isPending={isPending}
      user={user}
      onSubmit={onSubmit}
      cancelEditing={cancelEditing}
    />
  );
};

const UserInfo = ({
  user,
  setEditing,
}: {
  user: User;
  setEditing: () => void;
}) => {
  const { mutate: deleteProduct, isPending } = useQuery_DeleteUser(user.id);

  return (
    <div className="flex w-full flex-row gap-2">
      <p className="max-w-lg overflow-hidden text-xl text-wrap">
        {user.username}
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

const UserCard = ({ User }: { User: User }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="relative flex w-full gap-5 rounded-md">
      {isEditing ? (
        <UserEditForm user={User} cancelEditing={() => setIsEditing(false)} />
      ) : (
        <UserInfo user={User} setEditing={() => setIsEditing(true)} />
      )}
    </div>
  );
};

export const AdminUsers = () => {
  const currentUser = useUser();
  const { data, isLoading, isError, error } = useQuery_FetchUsers();
  const [isAddingUser, setIsAddingUser] = useState(false);

  if (isError) throw error;

  if (isLoading)
    return (
      <div className="absolute inset-0 flex h-full min-h-[80vh] w-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex w-full flex-col justify-center gap-5 px-5">
      {!isAddingUser ? (
        <button
          className="rounded-md bg-orange-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={() => setIsAddingUser(true)}
          key={"crearting user"}
        >
          Add New User
        </button>
      ) : (
        <UserCreateForm
          key={"crearting user form"}
          cancelEditing={() => setIsAddingUser(false)}
        />
      )}

      {data
        ?.filter((user) => user.username !== currentUser?.username)
        ?.map((user) => <UserCard User={user} key={user.id} />) ||
        "No Users..."}
    </div>
  );
};

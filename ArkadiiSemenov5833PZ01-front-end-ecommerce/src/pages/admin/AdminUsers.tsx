import { Spinner } from "../../components/icons";
import {
  useQuery_AddUser,
  useQuery_DeleteUser,
  useQuery_FetchUsers,
  useQuery_PutUser,
} from "../../data/queries";
import { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { User } from "../../data/types";
import { ErrorText } from "../../components/forms";



interface IFormDataUser {
  login: string;
  password: string;
}

const UserForm = ({
  user,
  onSubmit,
  cancelEditing,
  isPending,
}: {
  user: { login: string };
  onSubmit: SubmitHandler<IFormDataUser>;
  cancelEditing: () => void;
  isPending: boolean;
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<IFormDataUser>({
    defaultValues: { ...user, password: "password" },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex items-center h-full w-full gap-2"
    >

      <div className="flex-1 h-full flex-col max-w-lg gap-2 overflow-hidden text-wrap text-xl">
        <input
          {...register("login", {
            required: {
              value: true,
              message: "Please, enter login.",
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
        {<ErrorText message={errors?.login?.message} />}
      </div>


      <div className="flex-1 h-full flex-col max-w-lg gap-2 overflow-hidden text-wrap text-xl">
        <input
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
        className="h-full rounded-md bg-accent-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
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

const UserCreateForm = ({
  cancelEditing,
}: {
  cancelEditing: () => void;
}) => {
  const { mutate: createUser, isPending } = useQuery_AddUser();

  const onSubmit: SubmitHandler<IFormDataUser> = (data) => {
    createUser({
      login: data.login.trim(),
      password: data.password.trim(),
      role: "user",
    });
    cancelEditing();
  };

  return (
    <UserForm
      isPending={isPending}
      user={{
        login: "",
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
  const { mutate: updateUser, isPending } = useQuery_PutUser(
    user.id,
  );

  const onSubmit: SubmitHandler<IFormDataUser> = (data) => {
    updateUser({
      ...user,
      login: data.login.trim(),
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
  const { mutate: deleteProduct, isPending } = useQuery_DeleteUser(
    user.id,
  );

  return (
    <div className="flex w-full flex-row gap-2">
      <p className="max-w-lg overflow-hidden text-wrap text-xl">
        {user.login}
      </p>

      <div className="flex-1"></div>

      <button
        className="rounded-md bg-accent-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
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
        <UserEditForm
          user={User}
          cancelEditing={() => setIsEditing(false)}
        />
      ) : (
        <UserInfo
          user={User}
          setEditing={() => setIsEditing(true)}
        />
      )}
    </div>
  );
};

export const AdminUsers = () => {
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
          className="rounded-md bg-accent-500 px-5 py-2 text-base font-bold text-white hover:brightness-125"
          onClick={() => setIsAddingUser(true)}
        >
          Add New User
        </button>
      ) : (
        <UserCreateForm cancelEditing={() => setIsAddingUser(false)} />
      )}

      {data?.map((user) => (
        <UserCard User={user} key={user.id} />
      )) || "No Users..."}
    </div>
  );
};

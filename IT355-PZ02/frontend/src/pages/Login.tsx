import { Link } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";

import { useLogin } from "../data/auth";
import { ErrorText } from "../components/forms";

interface IFormInput {
  username: string;
  password: string;
}

export function Login() {
  const { mutate: login, isError } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = (data) =>
    login({
      username: data.username,
      password: data.password,
    });

  return (
    <div className="flex w-full flex-col items-center justify-center gap-5">
      <h1 className="text-3xl font-bold">Login</h1>
      <p className="text-sm text-slate-500">
        For testing use: user (pass: user) and admin (pass: admin)
      </p>

      <form
        className="flex w-80 flex-col items-center gap-5 rounded-lg bg-white p-5 drop-shadow-lg"
        onSubmit={handleSubmit(onSubmit)}
      >
        {isError && (
          <ErrorText
            message={`Failed to login, check your username and password.`}
          />
        )}

        <div className="flex w-full flex-col items-start gap-2">
          <label className="w-28 text-lg" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-400 p-2"
            {...register("username", {
              required: {
                value: true,
                message: "Please, enter your username.",
              },
              pattern: {
                value: /[^\s]/,
                message: "Username should not contain whitespace.",
              },
              minLength: {
                value: 3,
                message: "Username should contain at least 3 characters.",
              },
            })}
          />
          {<ErrorText message={errors?.username?.message} />}
        </div>
        <div className="flex w-full flex-col items-start gap-2">
          <label className="w-28 text-lg" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-400 p-2"
            {...register("password", { required: true })}
          />
          {errors?.password && (
            <ErrorText message={"Please enter your password."} />
          )}
        </div>

        <button
          type="submit"
          className="w-40 animate-pulse rounded-full border-2 border-orange-700 bg-orange-50 px-5 py-2 hover:animate-none disabled:animate-none disabled:border-slate-500 disabled:opacity-20"
        >
          Log In
        </button>

        <div className="text-center">
          <p>Don't have an account?</p>
          <Link to={"/signup"} className="text-orange-500 underline">
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}

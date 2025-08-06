import { useSignUp } from "../data/auth";
import { Link } from "react-router-dom";
import { type SubmitHandler, useForm } from "react-hook-form";
import { ErrorText } from "../components/forms";

interface IFormInput {
  username: string;
  password: string;
  passwordRepeat: string;
}

export function SignUp() {
  const { mutate: signUp, isError, error } = useSignUp();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = (data) =>
    signUp({
      username: data.username,
      password: data.password,
    });

  const password = watch("password");

  return (
    <div className="flex w-full min-w-80 flex-col items-center justify-center gap-5">
      <h1 className="text-3xl font-bold">Welcome!</h1>
      <p>Enter your user data:</p>

      <form
        className="flex w-80 flex-col items-center gap-3"
        onSubmit={handleSubmit(onSubmit)}
      >
        {isError && (
          <ErrorText message={`Failed to sign up, ${error.message}.`} />
        )}

        <div className="flex w-full flex-col items-start gap-1">
          <label className="w-full text-lg" htmlFor="username">
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
          <ErrorText message={errors.username?.message} />
        </div>

        <div className="flex w-full flex-col items-start gap-1">
          <label className="w-full text-lg" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-400 p-2"
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
          />
          <ErrorText message={errors.password?.message} />
        </div>

        <div className="flex w-full flex-col items-start gap-1">
          <label className="w-full text-lg" htmlFor="password">
            Repeat Password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-400 p-2"
            {...register("passwordRepeat", {
              validate: async (passwordRepeat: string) =>
                password === passwordRepeat,
            })}
          />
          {errors.passwordRepeat && (
            <ErrorText message={"Repeated passwords should match."} />
          )}
        </div>

        <button
          type="submit"
          className="animate-pulse rounded-full border-2 border-orange-700 bg-orange-50 px-5 py-2 hover:animate-none disabled:animate-none disabled:border-slate-500 disabled:opacity-20"
        >
          Sign Up
        </button>

        <div className="text-center">
          <p>
            Already have an account?{" "}
            <Link to={"/login"} className="text-orange-500 underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

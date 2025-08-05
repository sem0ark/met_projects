export const ErrorText = ({
  message,
}: {
  message: string | boolean | null | undefined;
}) =>
  !!message && (
    <p className="text-orange-600 p-1 text-sm text-wrap">{message}</p>
  );

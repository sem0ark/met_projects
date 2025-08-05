export const ErrorText = ({
  message,
}: {
  message: string | boolean | null | undefined;
}) =>
  !!message && (
    <p className="p-1 text-sm text-wrap text-orange-600">{message}</p>
  );

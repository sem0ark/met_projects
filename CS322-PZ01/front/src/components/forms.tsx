export const ErrorText = ({
  message,
}: {
  message: string | boolean | null | undefined;
}) =>
  !!message && (
    <p className="text-wrap p-1 text-sm text-accent-600">{message}</p>
  );

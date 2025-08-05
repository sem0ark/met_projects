import { useNavigate } from "react-router-dom";
import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useLogout } from "../data/auth";

export function Logout() {
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();

  return (
    <>
      <Dialog
        open={true}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => {}}
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="border-orange-500 bg-orange-100 w-full max-w-md rounded-xl border-2 bg-white/5 p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0">
              <DialogTitle
                as="h3"
                className="text-base/7 font-medium text-black"
              >
                Logout
              </DialogTitle>

              <p className="mt-2 text-sm/6 text-black/50">
                You will be logged out.
              </p>
              <div className="mt-4">
                <Button
                  className="bg-orange-700 data-[hover]:bg-orange-600 data-[open]:bg-orange-700 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Got it!
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
}

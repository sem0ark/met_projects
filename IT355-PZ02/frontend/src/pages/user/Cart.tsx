import { Link, useNavigate } from "react-router-dom";
import { useQuery_FetchProduct } from "../../data/queries";
import { useUserStore, useTotalPrice } from "../../stores/user";
import { CrossIcon } from "../../components/icons";
import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useState } from "react";

const CartTableEntry = ({
  productId,
  quantity,
}: {
  productId: number;
  quantity: number;
}) => {
  const removeProduct = useUserStore((state) => state.removeProduct);
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery_FetchProduct(productId);

  if (isError) throw error;
  if (isLoading) return <tr></tr>;

  return (
    <tr className="odd:bg-neutral-100">
      <td className="flex w-full flex-nowrap items-center gap-2 px-2 sm:p-2 sm:px-6">
        {product?.imageUrl !== undefined && (
          <div className="hidden h-8 w-8 overflow-hidden rounded-full sm:block">
            <img src={product.imageUrl} alt="" />
          </div>
        )}
        {product?.name !== undefined && <div>{product.name}</div>}
        <div className="flex-1"></div>
        <Button aria-label="Remove" onClick={() => removeProduct(productId)}>
          <CrossIcon className="text-orange-600 h-8 transition-transform duration-300 hover:scale-125" />
        </Button>
      </td>
      <td className="px-2 text-center sm:p-2 sm:px-6">{quantity}</td>
      <td className="px-2 text-center sm:p-2 sm:px-6">
        {((product?.price ?? 0) * quantity).toFixed(2)} RSD
      </td>
    </tr>
  );
};

const Checkout = () => {
  const [isOpen, setIsOpen] = useState(false);
  const clearCart = useUserStore((state) => state.clearCart);
  const navigate = useNavigate();

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-black/20 px-4 py-2 text-sm font-medium text-black focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white data-[hover]:bg-black/30"
      >
        Checkout
      </Button>

      <Dialog
        open={isOpen}
        as="div"
        className="relative z-10 focus:outline-none"
        onClose={() => setIsOpen(false)}
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="border-orange-500 bg-orange-100 w-full max-w-md rounded-xl border-2 p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0">
              <DialogTitle
                as="h3"
                className="text-base/7 font-medium text-black"
              >
                Payment successful
              </DialogTitle>

              <p className="mt-2 text-sm/6 text-black/50">
                Your payment has been successfully submitted. We've sent you an
                email with all of the details of your order.
              </p>
              <div className="mt-4">
                <Button
                  className="bg-orange-700 data-[hover]:bg-orange-600 data-[open]:bg-orange-700 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm/6 font-semibold text-white shadow-inner focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white"
                  onClick={() => {
                    setIsOpen(false);
                    clearCart();
                    navigate("/");
                  }}
                >
                  Got it, thanks!
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export function Cart() {
  const cartItems = useUserStore((state) => state.items);
  const total = useTotalPrice();

  if (cartItems.length === 0)
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-5">
        <h1 className="text-xl font-bold">Your cart is empty!</h1>
        <p className="text-base italic">Check out our products!</p>
        <Link
          to="/products"
          className="border-orange-700 bg-orange-50 animate-pulse rounded-full border-2 px-5 py-2 hover:animate-none"
        >
          See Products
        </Link>
      </div>
    );

  return (
    <div className="flex w-full flex-col items-center gap-5 px-5">
      <h1 className="text-xl">Checkout</h1>

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map(({ productId, quantity }) => (
            <CartTableEntry
              productId={productId}
              quantity={quantity}
              key={productId}
            />
          ))}

          <tr className="odd:bg-neutral-100">
            <td></td>
            <td></td>
            <td className="text-center font-bold">{total.toFixed(2)} RSD</td>
          </tr>
        </tbody>
      </table>

      <Checkout />
    </div>
  );
}

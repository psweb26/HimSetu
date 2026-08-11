import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({ title, message, onCancel, onConfirm, loading }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm font-medium leading-6 text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button loading={loading} onClick={onConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}

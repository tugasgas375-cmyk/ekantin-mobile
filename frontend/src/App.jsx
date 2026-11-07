import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerMenu from './pages/customer/CustomerMenu.jsx';
import TrackOrder from './pages/customer/TrackOrder.jsx';
import History from './pages/customer/History.jsx';
import Receipt from './pages/customer/Receipt.jsx';
import QrisPayment from './pages/customer/QrisPayment.jsx';
import CheckStatus from './pages/customer/CheckStatus.jsx';
import QueueScreen from './pages/customer/QueueScreen.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerMenu />} />
      <Route path="/track/:orderId" element={<TrackOrder />} />
      <Route path="/riwayat" element={<History />} />
      <Route path="/struk/:queueNumber" element={<Receipt />} />
      <Route path="/bayar/:orderId" element={<QrisPayment />} />
      <Route path="/cek-status" element={<CheckStatus />} />
      <Route path="/antrian" element={<QueueScreen />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

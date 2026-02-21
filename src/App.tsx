import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Tickets from './pages/Tickets';
import VIPSelection from './pages/VIPSelection';
import DaySelection from './pages/DaySelection';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import TicketView from './pages/TicketView';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/vip" element={<VIPSelection />} />
        <Route path="/day-selection" element={<DaySelection />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/success" element={<Success />} />
        <Route path="/ticket-view" element={<TicketView />} />
      </Routes>
    </Router>
  );
}

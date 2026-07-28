import { useState } from 'react';
import StockList from '../components/StockList';
import OrderBuilder from '../components/OrderBuilder';

export default function Inventory() {
  const [tab, setTab] = useState('stock');

  return (
    <div className="inventory-page">
      <div className="section-header">
        <h2>📦 Grocery Inventory</h2>
        <div className="tab-switch">
          <button className={`tab-btn ${tab === 'stock' ? 'active' : ''}`} onClick={() => setTab('stock')}>Stock</button>
          <button className={`tab-btn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Orders</button>
        </div>
      </div>
      {tab === 'stock' && <StockList />}
      {tab === 'orders' && <OrderBuilder />}
    </div>
  );
}

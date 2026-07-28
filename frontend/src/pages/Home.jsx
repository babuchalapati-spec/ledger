export default function Home({ onViewLedgers, onCreateCustomer, onOpenInventory, onOpenDeliveries }) {
  return (
    <div className="home-screen">
      <h2>What would you like to do?</h2>
      <div className="home-choices">
        <button className="home-card" onClick={onViewLedgers}>
          <span className="home-card-icon">📒</span>
          <span className="home-card-title">View / Select Customer Ledger</span>
          <span className="home-card-desc">Open an existing customer to add bills, payments, or view their statement</span>
        </button>
        <button className="home-card" onClick={onCreateCustomer}>
          <span className="home-card-icon">➕</span>
          <span className="home-card-title">Create New Customer</span>
          <span className="home-card-desc">Add a new customer with their name, address and GST number</span>
        </button>
        <button className="home-card" onClick={onOpenInventory}>
          <span className="home-card-icon">📦</span>
          <span className="home-card-title">Grocery Inventory & Orders</span>
          <span className="home-card-desc">Track home grocery stock (kg, g, litres, pieces) and place orders to restock items</span>
        </button>
        <button className="home-card" onClick={onOpenDeliveries}>
          <span className="home-card-icon">🚚</span>
          <span className="home-card-title">Deliveries</span>
          <span className="home-card-desc">Schedule what has to be delivered and when, with a daily reminder for anything still pending</span>
        </button>
      </div>
    </div>
  );
}

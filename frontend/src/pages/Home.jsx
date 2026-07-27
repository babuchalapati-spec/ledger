export default function Home({ onViewLedgers, onCreateCustomer }) {
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
      </div>
    </div>
  );
}

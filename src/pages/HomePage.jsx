import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="page-center">
      <h1>DollarSmart</h1>
      <p>Home (placeholder)</p>
      <Link to="/log" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>
        + Log
      </Link>
    </div>
  )
}

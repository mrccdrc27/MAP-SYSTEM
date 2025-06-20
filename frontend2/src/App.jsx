// designs
import 'font-awesome/css/font-awesome.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css'
import { BrowserRouter } from 'react-router-dom';

// route
import MainRoute from './routes/MainRoute';

function App() {
  return (
    <BrowserRouter> 
      <MainRoute />
    </BrowserRouter>
  )
}

export default App
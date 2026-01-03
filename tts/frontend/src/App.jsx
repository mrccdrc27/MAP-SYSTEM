// designs
// added
// npm install lucide-react

import 'font-awesome/css/font-awesome.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css'

import { BrowserRouter } from 'react-router-dom';
import MainRoute from './routes/MainRoute';
import { WorkflowRefreshProvider } from './components/workflow/WorkflowRefreshContext';
import { ThemeProvider } from './context/ThemeContext';

// import { WorkflowRefreshProvider } from './context/WorkflowRefreshContext'; // <-- import it

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <WorkflowRefreshProvider> {/* <-- wrap this */}
          <MainRoute />
        </WorkflowRefreshProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

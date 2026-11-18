import React, { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';

function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div>
      {isLogin ? <Login /> : <Signup />}
      <div className="flex justify-center my-4">
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-blue-500 underline"
        >
          {isLogin ? 'Need an account? Signup' : 'Already have an account? Login'}
        </button>
      </div>
    </div>
  );
}

export default App;


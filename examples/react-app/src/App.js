import React from 'react';
import logo from './logo.svg';
import './App.css';

function App({unleash}) {
  const showToggle = unleash.isEnabled('proxy.demo');
  return (
    <div className="App">
      <header className="App-header">
        {showToggle ? <img src={logo} className="App-logo" alt="logo" /> : null}
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

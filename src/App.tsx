import './App.css';

function App() {
  return (
    <div>
      <h2 className='text-3xl font-bold underline text-red-500'>Hello World</h2>
      <button onClick={() => {
        fetch('http://localhost:3000')
          .then((res) => res.json())
          .then((data) => console.log(data))
          .catch((err) => console.log(err));
      }}
      >
        Click me
      </button>
    </div>
  );
}

export default App

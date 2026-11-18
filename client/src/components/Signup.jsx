import React, { useState } from 'react';
import axios from 'axios';
const Signup = () => {
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const handleSubmit = async (e) => {
e.preventDefault();
try {
const response = await axios.post('https://sohel-smm-panel-server.onrender.com/auth/register', {
username,
email,
password
});
console.log('Signup successful:', response.data);
alert('Signup successful');
} catch (error) {
console.error('Signup failed:', error.response ? error.response.data : error.message);
alert('Signup failed');
}
};
return (
<div className="flex justify-center items-center min-h-screen bg-gray-100">
<form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
<h2 className="text-2xl mb-4 font-bold">Signup</h2>
<div className="mb-4">
<label className="block mb-1">Username</label>
<input
type="text"
value={username}
onChange={(e) => setUsername(e.target.value)}
className="w-full p-2 border rounded"
required
/>
</div>
<div className="mb-4">
<label className="block mb-1">Email</label>
<input
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
className="w-full p-2 border rounded"
required
/>
</div>
<div className="mb-4">
<label className="block mb-1">Password</label>
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
className="w-full p-2 border rounded"
required
/>
</div>
<button type="submit" className="w-full bg-green-500 text-white p-2 rounded">
Signup
</button>
</form>
</div>
);
};
export default Signup;

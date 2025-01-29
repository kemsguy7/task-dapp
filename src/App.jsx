import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import abi from './abi.json'

function App() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskText, setTaskText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const contractAddress = "0xc8c09c30c737a5292d9d4d3d1d11c52ec76a2cdc";

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  const checkIfWalletIsConnected = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
        getTasks();
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error("Error checking wallet connection");
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAddress(accounts[0]);
      setIsConnected(true);
      toast.success('Wallet connected successfully!');
      getTasks();
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  async function getTasks() {
    if (!isConnected) {
      console.log('Wallet not connected');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      console.log('Fetching tasks...');
      
      const tasksList = await contract.getMyTask();
      console.log('Raw tasks from contract:', tasksList);
      
      // Convert the Proxy object to a regular array
      const tasksArray = Array.from(tasksList);
      console.log('Tasks array:', tasksArray);
      
      // Process tasks
      const processedTasks = tasksArray
        .filter(task => {
          // Log each task for debugging
          console.log('Processing task:', task);
          return task && task.taskTitle && task.taskText && !task.isDeleted;
        })
        .map(task => {
          // Convert BigInt to number and ensure all fields are present
          const processed = {
            id: Number(task.id.toString()),
            taskTitle: task.taskTitle,
            taskText: task.taskText,
            isDeleted: task.isDeleted
          };
          console.log('Processed task:', processed);
          return processed;
        });
      
      console.log('Final processed tasks:', processedTasks);
      setTasks(processedTasks);
      
      if (processedTasks.length === 0) {
        toast.info('No tasks found');
      } else {
        toast.success(`Loaded ${processedTasks.length} tasks`);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to fetch tasks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddTask() {
    if (!isConnected) {
      toast.warning('Please connect your wallet first');
      return;
    }

    if (!taskTitle.trim() || !taskText.trim()) {
      toast.warning('Please fill in both title and description');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      const tx = await contract.addTask(taskText, taskTitle, false);
      toast.info('Adding task...', { autoClose: false, toastId: 'addTask' });
      
      await tx.wait();
      toast.dismiss('addTask');
      toast.success('Task added successfully!');
      
      // Clear inputs
      setTaskTitle('');
      setTaskText('');
      
      // Wait a bit before refreshing tasks to allow the blockchain to update
      setTimeout(() => {
        getTasks();
      }, 2000);
    } catch (error) {
      console.error('Add task error:', error);
      toast.error('Failed to add task: ' + error.message);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!isConnected) {
      toast.warning('Please connect your wallet first');
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);
      
      const tx = await contract.deleteTask(taskId);
      toast.info('Deleting task...', { autoClose: false, toastId: 'deleteTask' });
      
      await tx.wait();
      toast.dismiss('deleteTask');
      toast.success('Task deleted successfully!');
      
      // Wait a bit before refreshing tasks
      setTimeout(() => {
        getTasks();
      }, 2000);
    } catch (error) {
      console.error('Delete task error:', error);
      if (error.message.includes('owner')) {
        toast.error('You are not the owner of this task');
      } else {
        toast.error('Failed to delete task: ' + error.message);
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4 md:p-8">
      <div className="max-w-2xl mx-auto backdrop-blur-lg bg-white/10 rounded-xl shadow-2xl overflow-hidden p-6 border border-white/20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Task Manager
          </h1>
          <button
            onClick={connectWallet}
            className={`px-4 py-2 rounded-lg ${
              isConnected 
                ? 'bg-green-500/20 text-green-300 border border-green-500/50' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } transition-all duration-300`}
          >
            {isConnected ? 'Connected' : 'Connect Wallet'}
          </button>
        </div>

        {isConnected && (
          <div className="mb-4 text-sm text-gray-400">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
        
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-lg mb-3 text-white">Add New Task</h3>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Task Title"
              className="w-full bg-white/5 border border-white/20 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-400"
            />
            <textarea
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Task Description"
              className="w-full bg-white/5 border border-white/20 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-400 min-h-24"
            />
            <button 
              onClick={handleAddTask}
              disabled={!isConnected}
              className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Task
            </button>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg text-white">My Tasks</h3>
              <button 
                onClick={getTasks}
                disabled={!isConnected || isLoading}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Refresh Tasks'}
              </button>
            </div>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="text-lg font-medium text-white mb-2">{task.taskTitle}</h4>
                  <p className="text-gray-300 mb-4">{task.taskText}</p>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-300"
                  >
                    Delete Task
                  </button>
                </div>
              ))}
              {!isLoading && tasks.length === 0 && (
                <p className="text-gray-400 text-center py-4">No tasks found</p>
              )}
              {isLoading && (
                <p className="text-gray-400 text-center py-4">Loading tasks...</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  )
}

export default App
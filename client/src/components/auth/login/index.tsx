import React from 'react';
import './index.css';
import { Link } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';

/**
 * Renders a login form with username and password inputs, password visibility toggle,
 * error handling, and a link to the signup page.
 */
const Login = () => {
  const {
    username,
    password,
    showPassword,
    err,
    handleSubmit,
    handleInputChange,
    togglePasswordVisibility,
  } = useAuth('login');

  return (
    <div className='container'>
      <h2>Welcome to FakeStackOverflow!</h2>
      <h3>Please login to continue.</h3>
      {/* DONE: Task 1 - Correctly handle form submission */}
      <form onSubmit={handleSubmit}>
        <h4>Please enter your username.</h4>
        {/* DONE: Task 1 - Add an input field for the username input.
        The input field should correctly update the displayed value when text
        is entered. Use the 'input-text' class for styling.
        */}
        <input
          type='text'
          value={username}
          className='input-text'
          placeholder='Enter username'
          onChange={e => handleInputChange(e, 'username')}
          required
        />
        <h4>Please enter your password.</h4>
        {/* DONE: Task 1 - Add an input field for the password input.
        The input field should correctly update the value when text
        is entered. Make sure that the password visibility is correctly toggled.
        Use the 'input-text' class for styling.
        */}
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          className='input-text'
          placeholder='Enter password'
          onChange={event => handleInputChange(event, 'password')}
          required
        />
        <div className='show-password'>
          {/* DONE: Task 1 - Add a checkbox input field for the visibility toggle.
        The field should correctly update the password visibility when checked/unchecked.
        Use the id 'showPasswordToggle'. No styling class is required here.
        */}
          <input
            type='checkbox'
            checked={showPassword}
            id='showPasswordToggle'
            onChange={togglePasswordVisibility}
          />
          <label htmlFor='showPasswordToggle'>Show Password</label>
        </div>
        <button type='submit' className='login-button'>
          Submit
        </button>
      </form>
      {err && <p className='error-message'>{err}</p>}
      <Link to='/signup' className='signup-link'>
        Don&apos;t have an account? Sign up here.
      </Link>
    </div>
  );
};

export default Login;

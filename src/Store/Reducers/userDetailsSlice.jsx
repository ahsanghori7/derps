// authSlice.js
import { createSlice } from '@reduxjs/toolkit';

// const storedUserDetails = localStorage.getItem('userDetails');
const userDetailsSlice = createSlice({
  name: 'userDetails',
  initialState: {
    // userDetails: storedUserDetails || null,
    userDetails: {},
  },
  reducers: {
    setUserDetails: (state, action) => {
      state.userDetails = action.payload;
      // localStorage.setItem("userDetails" , action.payload);
    },
    clearUserDetails: (state) => {
      state.userDetails = null;
      // localStorage.removeItem("userDetails");
    },
  },
});

export const { setUserDetails, clearUserDetails } = userDetailsSlice.actions;
export default userDetailsSlice.reducer;

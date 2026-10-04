import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  signin: false,
};

const SigninReducer = createSlice({
  name: 'signinReducer',
  initialState,
  reducers: {
    signin: (state, action) => {
      state.signin = action.payload;
    },
  },
});

export default SigninReducer.reducer;
export const { signin } = SigninReducer.actions;

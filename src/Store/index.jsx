// import {configureStore, getDefaultMiddleware} from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import PopupReducer from './Reducers/PopupReducer';
import authSlice from './Reducers/authSlice';
import userDetailsSlice from './Reducers/userDetailsSlice';
import SigninReducer from './Reducers/signinSlice';

export const Store = configureStore({
  reducer: {
    PopupReducer: PopupReducer,
    signinReducer: SigninReducer,
    auth: authSlice,
    userData: userDetailsSlice,
  },
  // middleware: getDefaultMiddleware({
  //   serializableCheck: false,
  // }),
});

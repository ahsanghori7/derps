import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userData: false,
};

const PopupReducer = createSlice({
  name: 'popupReducer',
  initialState,
  reducers: {
    ticketDetailScreen: (state, action) => {
      state.userData = action.payload;
    },
    removeTicketDetailScreen: (state) => {
      state.userData = false;
    },
  },
});

export default PopupReducer.reducer;
export const { ticketDetailScreen, removeTicketDetailScreen } = PopupReducer.actions;

import { TPersistedApp } from '@/src/Types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';

const initialState: TPersistedApp = {
    user_data: {
        _id: "",
        names: "",
        gender: 0,
        account_type: 0,
        createdAt: "",
        updatedAt: ""
    },
    theme: 'light',
    language: 'fr'
}

// 848614197956-07m26uktq5pj7d9q9u4tu677o15b6afp.apps.googleusercontent.com

export const persistedAppSlice = createSlice({
    name: 'persistedApp',
    initialState,
    reducers: {
        // setFirstUse: (state, action: PayloadAction<boolean>) => {
        //     state.first_use = action.payload
        // },
        setTheme: (state, action: PayloadAction<string>) => {
            state.theme = action.payload;
        },
        setUserData: (state, action: PayloadAction<TPersistedApp['user_data']>) => {
            state.user_data = action.payload;
        },
        setLanguage: (state, action: PayloadAction<string>) => {
            state.language = action.payload;
        },
        // setLoadingButton: (state, action: PayloadAction<boolean>) => {
        //     state.loading_button = action.payload;
        // },
        // setShowModalApp: (state, action: PayloadAction<boolean>) => {
        //     state.modal_app = action.payload;
        // },
        // setTitle: (state, action: PayloadAction<string>) => {
        //     state.title = action.payload;
        // },
        // setSearchContactEnabled: (state, action: PayloadAction<boolean>) => {
        //     state.search_contact_enabled = action.payload;
        // },
        // setRawContacts: (state, action: PayloadAction<TContact[]>) => {
        //     action.payload.map((item, index) => (
        //         state.raw_contacts[index] = item
        //     ))
        // },
        // updateContacts: (state, action: PayloadAction<TUser[]>) => {
        //     action.payload.map((item, index) => (
        //         state.contacts[index] = item
        //     ))
        // },
        // setAfterSale: (state, action: PayloadAction<number>) => {
        //     state.app_description.after_sale = action.payload;
        // },
        // setTypeSaleBoard: (state, action: PayloadAction<number>) => {
        //     state.app_description.type_sale_board = action.payload;
        // },
        // setCloseSaleBoardAfterOperation: (state, action: PayloadAction<number>) => {
        //     state.app_description.close_sale_board_after_operation = action.payload;
        // },
        // setRequirePasswordBusiness: (state, action: PayloadAction<boolean>) => {
        //     state.app_description.require_password_business = action.payload;
        // },
        // setPasswordBusiness: (state, action: PayloadAction<string>) => {
        //     state.app_description.password_business = action.payload;
        // },
        // setBusinessBadge: (state, action: PayloadAction<TBusinessBadge[]>) => {
        //     state.business_badge = action.payload;
        // },
        // setAddBusinessBadge: (state, action: PayloadAction<TBusinessBadge>) => {
        //     if (state.business_badge) {
        //         state.business_badge.push(action.payload);
        //     } else {
        //         state.business_badge = [];
        //         state.business_badge.push(action.payload);
        //     }
        // },
        // setRemoveBusinessBadge: (state, action: PayloadAction<string>) => {
        //     if (state.business_badge) {
        //         state.business_badge = state.business_badge.filter(el => el.business_id !== action.payload);
        //     }
        // },
        // setRemoveSalesPointBadge: (state, action: PayloadAction<string>) => {
        //     if (state.business_badge) {
        //         state.business_badge = state.business_badge.filter(el => el.sales_point_id !== action.payload);
        //     }
        // },
        // setDefaultMessageSettingsData: (state) => {
        //     // if (state.app_description.inbox_appearance_style) {
        //     state.app_description.inbox_appearance_style = 0;
        //     // }
        // },
        // setRawContactsPersisted: (state, action: PayloadAction<TContact[]>) => {
        //     // action.payload.map((item, index) => {

        //     //     const contact = state.raw_contacts.find(element => element.phoneNumber === item.phoneNumber);

        //     //     if (contact === undefined) {
        //     //         return state.raw_contacts[index] = item;
        //     //     }
        //     // });
        //     state.raw_contacts = action.payload;
        // },
    }
})

export const {
    setTheme,
    setUserData,
    setLanguage,
    // setAfterSale,
    // setTypeSaleBoard,
    // setCloseSaleBoardAfterOperation,
    // setRequirePasswordBusiness,
    // setBusinessBadge,
    // setAddBusinessBadge,
    // setRemoveBusinessBadge,
    // setRemoveSalesPointBadge,
    // setPasswordBusiness,
    // setRawContactsPersisted,
    // setDefaultMessageSettingsData
} = persistedAppSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectPersistedApp = (state: RootState) => state.persisted_app;

export default persistedAppSlice.reducer;

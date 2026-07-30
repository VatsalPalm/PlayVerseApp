import moment from 'moment';
import { MMKV } from 'react-native-mmkv';


export const storage = new MMKV();
export const key = {
    appTheme: 'appTheme',
    expireDate: 'expireDate',
    mobileNumber: 'mobileNumber',
    notificationPermissonRequest: 'notificationPermissonRequest',

}

export const setExpireDate = () => {
    const expireDate = moment().add(60, 'days').toISOString();
    // const expireDate = moment().add(1, 'days').toISOString();
    storage.set(key.expireDate, expireDate)
}

export const getExpireDate = () => {
    if (storage.contains(key.expireDate)) {
        return storage.getString(key.expireDate)
    }
}


export const setMobileNumber = (mobile: number) => {
    storage.set(key.mobileNumber, mobile.toString())
}

export const getMobileNumber = () => {
    if (storage.contains(key.mobileNumber)) {
        return storage.getString(key.mobileNumber)
    }
}

export const getNotificationPermissonRequest = () => {
    if (storage.contains(key.notificationPermissonRequest)) {
        return storage.getBoolean(key.notificationPermissonRequest) === true;
    }
};

export const setNotificationPermissonRequest = (value: boolean) => {
    storage.set(key.notificationPermissonRequest, value);
};
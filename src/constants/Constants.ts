const http: string = "http://";
// export const remote_url: string = http + "192.168.43.147:6841";
export const remote_url: string = http + "192.168.0.103:6841";
// export const remote_url: string = http + "payall.yambi.net";

export const randomString = (length: number) => {
    let s = '';
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < length; i++) {
        s += chars.charAt(Math.random() * 62 | 0);
    }
    return s;
}

export const randomInt = (length: number) => {
    let s = '';
    const digits = '0123456789';
    for (let i = 0; i < length; i++) {
        s += digits.charAt(Math.random() * 10 | 0);
    }
    return s;
}


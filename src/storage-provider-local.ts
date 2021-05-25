import AsyncStorage from "@react-native-community/async-storage";
import IStorageProvider from './storage-provider';

export default class LocalStorageProvider implements IStorageProvider {
    private prefix = 'unleash:repository';

    public save(name: string, data: any) {
        try {
            const repo = JSON.stringify(data);
            const key = `${this.prefix}:${name}`;
            try {
                AsyncStorage.setItem(key, repo).then((e: any) => {
                    console.log(`Unleash local save completed for ${key} with value ${repo} and response is ${JSON.stringify(e)}`);
                });
            } catch(ex) {
                console.error(ex);  
            }
            // below line is not needed for react-native mobile app
            window.localStorage.setItem(key, repo);
        } catch(e) {
            // tslint:disable-next-line
            console.error(e);
        }
    }

    public get(name: string) {
        try {
            const key = `${this.prefix}:${name}`;
            let data = undefined;
            try {
                AsyncStorage.getItem(key).then((value: any) => {
                    data = value;
                });
                return data ? JSON.parse(data) : undefined;
            } catch(ex) {
                console.error(ex);
            }
            // below lines are not needed for react-native mobile app
            data = window.localStorage.getItem(key);
            return data ? JSON.parse(data) : undefined;
        } catch(e) {
            // tslint:disable-next-line
            console.error(e);
        }
    }

}

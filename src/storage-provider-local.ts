import IStorageProvider from './storage-provider';

export default class LocalStorageProvider implements IStorageProvider {
    private prefix = 'unleash:repository';

    public save(name: string, data: any) {
        try {
            const repo = JSON.stringify(data);
            const key = `${this.prefix}:${name}`;
            window.localStorage.setItem(key, repo);
        } catch(e) {
            // tslint:disable-next-line
            console.error(e);
        }
    }

    public get(name: string) {
        try {
            const key = `${this.prefix}:${name}`;
            const data = window.localStorage.getItem(key);
            return data ? JSON.parse(data) : undefined;
        } catch(e) {
            // tslint:disable-next-line
            console.error(e);
        }
    }

}
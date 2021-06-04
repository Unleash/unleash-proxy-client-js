export default interface IStorageProvider {
    save: (name: string, data: any) => Promise<void>;
    get: (name: string) => Promise<any>;
}

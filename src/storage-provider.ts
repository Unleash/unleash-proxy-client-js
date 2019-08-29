export default interface IStorageProvider {
    save: (name: string, data: any) => void;
    get: (name: string) => any;
}

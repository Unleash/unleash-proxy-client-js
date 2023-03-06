import type IStorageProvider from './storage-provider';

export default class InMemoryStorageProvider implements IStorageProvider {
    private store = new Map();

    public async save(name: string, data: any) {
        this.store.set(name, data);
    }

    public async get(name: string) {
        return this.store.get(name);
    }
}

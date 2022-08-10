import LocalStorageProvider from './storage-provider-local';

describe('LocalStorageProvider', () => {
    it('should store and retrieve arbitrary values by key', async () => {
        const store = new LocalStorageProvider();

        await store.save('key1', 'value1');
        await store.save('key2', { value2: 'true' });
        await store.save('key3', ['value3']);
        await store.save('key4', true);

        expect(await store.get('key1')).toBe('value1');
        expect(await store.get('key2')).toMatchObject({ value2: 'true' });
        expect(await store.get('key3')).toMatchObject(['value3']);
        expect(await store.get('key4')).toBe(true);
    });

    it('should return undefined for empty value', async () => {
        const store = new LocalStorageProvider();
        expect(await store.get('notDefinedKey')).toBe(undefined);
    });
});

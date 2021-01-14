import { useCallback, useEffect, useState } from 'react';

export type Subscriber = (...args: readonly any[]) => void;
export type UnSubscriber = () => void;

const subscriptions: Map<Symbol, Subscriber[]> = new Map();

export class EventBus {
    constructor(protected event: Symbol) {}

    subscribe(event: Symbol, subscriber: Subscriber) {
        let subscribers = subscriptions.get(event);
        if (!subscribers) {
            subscribers = [];
            subscriptions.set(event, subscribers);
        }
        subscribers.push(subscriber);
    }

    unSubscribe(event: Symbol, subscriber: Subscriber) {
        const subscribers = subscriptions.get(event);
        subscribers?.splice(subscribers?.indexOf(subscriber), 1);
    }

    hasSubscribers(event: Symbol) {
        const subscribers = subscriptions.get(event);
        return subscribers && subscribers.length > 0;
    }

    publish(event: Symbol, ...args: readonly any[]) {
        console.log(args, 'args=====')
        subscriptions.get(event)?.forEach(subscriber => subscriber(args));
    }
}



interface Disconnect {
    disconnect: UnSubscriber;
}

export class Stateful<T, U extends string> {

    constructor(protected value: T, protected event: U) {}

    private symbolEvent:Symbol = Symbol(this.event);

    private eventBus:EventBus = new EventBus(this.symbolEvent);


    snapshot(): T {
        return this.value;
    }

    protected update(value: T) {
        if (this.value !== value) {
            this.value = value;
            this.eventBus.publish(this.symbolEvent, value)
        }
    }

    subscribe(callback: (value: T) => void): Disconnect {
        this.eventBus.subscribe(this.symbolEvent, callback)
        return {
            disconnect: () => {
                this.eventBus.unSubscribe(this.symbolEvent, callback)
            },
        };
    }
}

export class Atom<T> extends Stateful<T, string> {
    public setState(value: T) {
        super.update(value);
    }
}

type SelectorGenerator<T> = (context: { get: <V>(dep: Stateful<V, string>) => V }) => T;


export class Selector<T> extends Stateful<T, string> {

    private registeredDeps = new Set<Stateful<any, string>>();

    private addDep<V>(dep: Stateful<V, string>): V {
        if (!this.registeredDeps.has(dep)) {
            dep.subscribe(() => this.updateSelector());
            this.registeredDeps.add(dep);
        }

        return dep.snapshot();
    }

    private updateSelector() {
        this.update(this.generate({ get: dep => this.addDep(dep) }));
    }

    constructor(private readonly generate: SelectorGenerator<T>, protected readonly event:string) {
        super(undefined as any, event);
        this.value = generate({ get: dep => this.addDep(dep) });
    }
}

export function atom<V>(value: { key: string; default: V }): Atom<V> {
    return new Atom(value.default, value.key);
}

export function selector<V>(value: {
    key: string;
    get: SelectorGenerator<V>;
}): Selector<V> {
    return new Selector(value.get, value.key);
}


export function useCoiledValue<T>(value: Stateful<T, string>): T {
    const [, updateState] = useState({});

    useEffect(() => {
        const { disconnect } = value.subscribe(() => updateState({}));
        return () => disconnect();
    }, [value]);

    return value.snapshot();
}

// Similar to the above method, but it also lets you set state.
export function useCoiledState<T>(atom: Atom<T>): [T, (value: T) => void] {
    const value = useCoiledValue(atom);
    return [value, useCallback(value => atom.setState(value), [atom])];
}

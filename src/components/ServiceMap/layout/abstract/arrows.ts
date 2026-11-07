import { action, computed, makeObservable } from 'mobx';

import type { XY } from '../../geometry';

export abstract class Arrow {
  #points: XY[] = [];

  constructor() {
    makeObservable(this);
  }

  public get id(): string {
    throw new Error('not implemented');
  }

  @computed
  public get points(): XY[] {
    return this.#points.slice();
  }

  @computed
  public get start(): XY | undefined {
    return this.points.at(0);
  }

  @computed
  public get end(): XY | undefined {
    return this.points.at(-1);
  }

  @action
  public addPoint(p: XY): this {
    this.#points.push(p);
    return this;
  }
}

export type ArrowsMap = Map<string, Arrow>;

export abstract class ArrowStrategy<A = Arrow> {
  protected _arrows: Map<string, A> = new Map();

  constructor() {
    makeObservable(this);
  }

  @computed
  public get arrows(): Map<string, A> {
    return new Map(this._arrows);
  }

  @action.bound
  public reset() {
    this._arrows.clear();
  }
}
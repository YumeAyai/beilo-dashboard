import { action, makeObservable, observable } from 'mobx';

import { Vec2 } from '../../geometry';

import { AccessPointArrow, createCardOffsetAdvancers, ServiceMapArrow, SIZES } from '../../service-map/arrow-core';
import { ArrowStrategy } from '../abstract/arrows';
import { ServiceMapPlacementStrategy } from './placement';

export class ServiceMapArrowStrategy extends ArrowStrategy<ServiceMapArrow> {
  public placement: ServiceMapPlacementStrategy;
  public connections: Map<string, Map<string, { verdicts: Set<string>; destinationPort: number; throughput: { flowAmount: number; latency: number } }>>;

  constructor(placement: ServiceMapPlacementStrategy) {
    super();
    makeObservable(this, {
      placement: observable,
      connections: observable,
      rebuild: action.bound,
    });
    this.placement = placement;
    this.connections = new Map();
  }

  public setConnections(connections: Map<string, Map<string, { verdicts: Set<string>; destinationPort: number; throughput: { flowAmount: number; latency: number } }>>) {
    this.connections = connections;
  }

  public rebuild() {
    this.rebuildArrows();
  }

  private rebuildArrows() {
    this._arrows.clear();

    const arrowMap = this.arrowsMap;
    arrowMap.forEach((arrow, arrowId) => {
      this._arrows.set(arrowId, arrow);
    });
  }

  public get combinedAccessPointArrowsMap(): Map<string, Map<string, AccessPointArrow>> {
    const combined: Map<string, Map<string, AccessPointArrow>> = new Map();

    this._arrows.forEach((arrow) => {
      const smArrow = arrow;
      smArrow.accessPointArrows.forEach((apArrow: AccessPointArrow, apArrowId: string) => {
        if (apArrow.connectorId == null) return;

        if (!combined.has(apArrow.connectorId)) {
          combined.set(apArrow.connectorId, new Map());
        }

        const connectorArrows = combined.get(apArrow.connectorId);
        if (connectorArrows == null) return;

        const existing = connectorArrows.get(apArrowId);
        if (existing == null) {
          connectorArrows.set(apArrowId, apArrow);
          return;
        }

        existing.addVerdicts(apArrow.verdicts);
      });
    });

    return combined;
  }

  private get arrowsMap(): Map<string, ServiceMapArrow> {
    const arrows: Map<string, ServiceMapArrow> = new Map();
    const bboxes = this.placement.cardsBBoxes;

    const cardConnectorCoords = new Map<string, Vec2>();

    bboxes.forEach((bbox, cardId) => {
      const vec = Vec2.fromXY({ x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h * 0.6 });
      cardConnectorCoords.set(cardId, vec);
    });

    this.connections.forEach((receivers, senderId) => {
      const senderBBox = bboxes.get(senderId);
      if (senderBBox == null) return;

      receivers.forEach((connInfo, receiverId) => {
        const receiverBBox = bboxes.get(receiverId);
        if (receiverBBox == null) return;

        const arrow = new ServiceMapArrow()
          .from(senderId, senderBBox)
          .to(receiverId, receiverBBox);

        arrows.set(arrow.id, arrow);

        const senderCoords = cardConnectorCoords.get(senderId);
        const receiverCoords = cardConnectorCoords.get(receiverId);
        if (!senderCoords || !receiverCoords) return;

        arrow
          .addPoint({
            x: senderBBox.x + senderBBox.w,
            y: senderBBox.y + SIZES.arrowStartTopOffset,
          })
          .addPoint({ x: receiverBBox.x, y: receiverCoords.y });

        arrow.addAccessPointArrow(receiverId, `${receiverId}->${connInfo.destinationPort}`)
          .addVerdicts(connInfo.verdicts)
          .setPoints([receiverCoords, { x: receiverBBox.x, y: receiverCoords.y }]);
      });
    });

    const offsets = createCardOffsetAdvancers();

    arrows.forEach((arrow: ServiceMapArrow) => {
      arrow.buildPointsAroundSenderAndReceiver(offsets);
      arrow.computeFlowsInfoIndicatorPosition();
    });

    return arrows;
  }
}
import { useState } from 'react';
import { ArrowLeftRight, Gavel, TrendingDown, TrendingUp, X } from 'lucide-react';
import {
  AuctionListing,
  DirectTradeOffer,
  MATERIAL_NAMES,
  MarketCommodity,
  MaterialId,
  PlayerProfile,
} from '../types/game';

interface MarketAuctionModalProps {
  player: PlayerProfile;
  market: MarketCommodity[];
  auctions: AuctionListing[];
  trades: DirectTradeOffer[];
  onClose: () => void;
  onMarketTrade: (materialId: MaterialId, action: 'buy' | 'sell', qty: number) => void;
  onAuctionBid: (listingId: string, amount: number, buyout?: boolean) => void;
  onAuctionList: (itemId: string, startingBid: number, buyoutPrice: number) => void;
  onCreateTrade: (
    offerMaterial: MaterialId,
    offerQty: number,
    requestMaterial: MaterialId,
    requestQty: number,
    bonusGoldOffer: number,
  ) => void;
  onAcceptTrade: (tradeId: string) => void;
}

export function MarketAuctionModal({
  player,
  market,
  auctions,
  trades,
  onClose,
  onMarketTrade,
  onAuctionBid,
  onAuctionList,
  onCreateTrade,
  onAcceptTrade,
}: MarketAuctionModalProps) {
  const [tab, setTab] = useState<'auction' | 'market' | 'p2p'>('auction');

  // Auction Listing form
  const listableItems = player.inventory.filter((i) => !i.equipped && !i.listedInAuction);
  const [listItemId, setListItemId] = useState(listableItems[0]?.id || '');
  const [startBid, setStartBid] = useState(350);
  const [buyoutPrice, setBuyoutPrice] = useState(900);

  // P2P Trade form
  const [offerMat, setOfferMat] = useState<MaterialId>('sunstone');
  const [offerQty, setOfferQty] = useState(2);
  const [reqMat, setReqMat] = useState<MaterialId>('dragon_scale');
  const [reqQty, setReqQty] = useState(1);
  const [bonusGold, setBonusGold] = useState(50);

  const handleListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = listItemId || listableItems[0]?.id;
    if (!targetId) return;
    onAuctionList(targetId, startBid, buyoutPrice);
  };

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (offerMat === reqMat) return;
    onCreateTrade(offerMat, offerQty, reqMat, reqQty, bonusGold);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              Grand Exchange & Peer Auction House
            </h2>
            <p className="text-xs text-slate-400">
              Escrow-secured item auctions, live supply/demand commodity pricing, and direct player swaps
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Market modal"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950/60 px-5 py-2">
          <button
            type="button"
            onClick={() => setTab('auction')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'auction' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Auction House ({auctions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('market')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'market' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Dynamic Economy
          </button>
          <button
            type="button"
            onClick={() => setTab('p2p')}
            className={`min-h-[40px] rounded-lg px-4 text-xs font-bold transition-colors ${
              tab === 'p2p' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            P2P Trading ({trades.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'auction' && (
            <div className="space-y-5">
              {/* List Rare Gear Form */}
              <form
                onSubmit={handleListSubmit}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="mb-2 text-xs font-bold text-amber-400">List Unequipped Gear in Escrow</div>
                {listableItems.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Forge or unequip an item in the Sunforge Armory to list it on the Auction House.
                  </p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-4 sm:items-end">
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] text-slate-400">Select Item</label>
                      <select
                        value={listItemId || listableItems[0]?.id}
                        onChange={(e) => setListItemId(e.target.value)}
                        className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white"
                      >
                        {listableItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} +{i.level} ({i.rarity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-400">Start Bid (G)</label>
                      <input
                        type="number"
                        min={50}
                        value={startBid}
                        onChange={(e) => setStartBid(Number(e.target.value))}
                        className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] text-slate-400">Buyout (G)</label>
                        <input
                          type="number"
                          min={150}
                          value={buyoutPrice}
                          onChange={(e) => setBuyoutPrice(Number(e.target.value))}
                          className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="mt-auto min-h-[42px] shrink-0 rounded-xl bg-amber-500 px-4 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                      >
                        List
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {/* Active Auctions */}
              <div className="grid gap-3 sm:grid-cols-2">
                {auctions.map((auc) => {
                  const isMine = auc.sellerId === player.id;
                  const minNext = auc.highestBidderId ? auc.currentBid + 25 : auc.startingBid;
                  const minsLeft = Math.max(1, Math.ceil((auc.endsAt - Date.now()) / 60000));
                  return (
                    <div
                      key={auc.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>
                            {auc.item.rarity} · Seller: {auc.sellerName}
                          </span>
                          <span className="font-mono">{minsLeft}m left</span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-extrabold text-white">
                          {auc.item.name} <span className="font-mono text-amber-400">+{auc.item.level}</span>
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                          +{auc.item.attackBonus} ATK · +{auc.item.hpBonus} HP · +{auc.item.lootBonusPct}% Loot
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5 text-xs tabular-nums">
                          <div>
                            <div className="text-slate-400">Current Bid</div>
                            <div className="font-mono text-base font-bold text-amber-400">
                              {auc.currentBid.toLocaleString()} G
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {auc.highestBidderName ? `Leader: ${auc.highestBidderName}` : 'No bids yet'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-400">Instant Buyout</div>
                            <div className="font-mono text-base font-bold text-sky-400">
                              {auc.buyoutPrice.toLocaleString()} G
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          disabled={isMine}
                          onClick={() => onAuctionBid(auc.id, minNext, false)}
                          className={`flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
                            isMine
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-800 text-white hover:bg-slate-700'
                          }`}
                        >
                          <Gavel className="h-3.5 w-3.5 text-amber-400" />
                          <span>Bid {minNext}G</span>
                        </button>
                        <button
                          type="button"
                          disabled={isMine}
                          onClick={() => onAuctionBid(auc.id, auc.buyoutPrice, true)}
                          className={`flex min-h-[42px] flex-1 items-center justify-center rounded-xl text-xs font-extrabold ${
                            isMine
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                          }`}
                        >
                          Buyout {auc.buyoutPrice}G
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'market' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {market.map((comm) => {
                const delta = comm.currentPrice - comm.previousPrice;
                const up = delta >= 0;
                const owned = player.materials[comm.id] || 0;
                return (
                  <div
                    key={comm.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-extrabold text-white">{comm.name}</h3>
                        <span
                          className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums ${
                            up ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {up ? '+' : ''}
                          {delta}G
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between tabular-nums">
                        <span className="font-mono text-2xl font-extrabold text-amber-400">
                          {comm.currentPrice} G
                        </span>
                        <span className="text-xs text-slate-400">
                          Owned: <strong className="text-white">{owned}</strong> · Supply {comm.supply} / Demand {comm.demand}
                        </span>
                      </div>

                      {/* Mini Sparkline Bars */}
                      <div className="mt-3 flex h-10 items-end gap-1">
                        {comm.history.map((val, idx) => {
                          const max = Math.max(...comm.history, 1);
                          return (
                            <div
                              key={idx}
                              className="flex-1 rounded-t bg-sky-500/60"
                              style={{ height: `${Math.max(18, Math.round((val / max) * 100))}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onMarketTrade(comm.id, 'buy', 1)}
                        className="min-h-[42px] flex-1 rounded-xl bg-emerald-500 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"
                      >
                        Buy 1 ({comm.currentPrice}G)
                      </button>
                      <button
                        type="button"
                        disabled={owned < 1}
                        onClick={() => onMarketTrade(comm.id, 'sell', 1)}
                        className={`min-h-[42px] flex-1 rounded-xl text-xs font-bold ${
                          owned >= 1
                            ? 'bg-slate-800 text-white hover:bg-slate-700'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Sell 1 (+{Math.round(comm.currentPrice * 0.92)}G)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'p2p' && (
            <div className="space-y-5">
              <form
                onSubmit={handleTradeSubmit}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="mb-2 text-xs font-bold text-sky-400">Post Escrowed Peer-to-Peer Material Swap</div>
                <div className="grid gap-2.5 sm:grid-cols-5 sm:items-end">
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">You Offer</label>
                    <select
                      value={offerMat}
                      onChange={(e) => setOfferMat(e.target.value as MaterialId)}
                      className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                    >
                      {(Object.keys(MATERIAL_NAMES) as MaterialId[]).map((m) => (
                        <option key={m} value={m}>
                          {MATERIAL_NAMES[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Qty</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={offerQty}
                      onChange={(e) => setOfferQty(Number(e.target.value))}
                      className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">You Request</label>
                    <select
                      value={reqMat}
                      onChange={(e) => setReqMat(e.target.value as MaterialId)}
                      className="min-h-[42px] w-full rounded-xl border border-slate-700 bg-slate-900 px-2 text-xs text-white"
                    >
                      {(Object.keys(MATERIAL_NAMES) as MaterialId[]).map((m) => (
                        <option key={m} value={m}>
                          {MATERIAL_NAMES[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-400">Req Qty + Gold</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={reqQty}
                        onChange={(e) => setReqQty(Number(e.target.value))}
                        className="min-h-[42px] w-14 rounded-xl border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        max={2000}
                        value={bonusGold}
                        onChange={(e) => setBonusGold(Number(e.target.value))}
                        className="min-h-[42px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-2 font-mono text-xs text-amber-400"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-xl bg-sky-500 px-4 text-xs font-extrabold text-slate-950 hover:bg-sky-400"
                  >
                    Post Offer
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {trades.map((tr) => {
                  const isMine = tr.creatorId === player.id;
                  return (
                    <div
                      key={tr.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowLeftRight className="h-5 w-5 text-sky-400" />
                        <div className="text-xs">
                          <div className="font-bold text-white">
                            {tr.creatorName} offers {tr.offerQty}× {MATERIAL_NAMES[tr.offerMaterial]}
                            {tr.bonusGoldOffer > 0 ? ` + ${tr.bonusGoldOffer} Gold` : ''}
                          </div>
                          <div className="text-slate-400">
                            Requests {tr.requestQty}× {MATERIAL_NAMES[tr.requestMaterial]}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isMine}
                        onClick={() => onAcceptTrade(tr.id)}
                        className={`min-h-[42px] rounded-xl px-4 text-xs font-extrabold ${
                          isMine
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        }`}
                      >
                        {isMine ? 'Your Offer' : 'Accept Swap'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

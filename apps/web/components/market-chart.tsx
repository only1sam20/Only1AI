'use client';

import { useEffect, useRef, useState } from 'react';
import type { IChartApi, UTCTimestamp } from 'lightweight-charts';
import type { MarketCandles } from '../lib/api';
import styles from './phase-three.module.css';

export function MarketChart({ data }: { data: MarketCandles }) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const lastBar = data.bars.at(-1);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let mounted = true;
    let chart: IChartApi | undefined;
    let observer: ResizeObserver | undefined;
    setError('');

    import('lightweight-charts').then(({ createChart, CandlestickSeries, ColorType }) => {
      if (!mounted) return;
      chart = createChart(element, {
        width: element.clientWidth,
        height: element.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#081222' },
          textColor: '#a0b2c8',
          fontFamily: 'Inter, system-ui, sans-serif',
          attributionLogo: true,
        },
        grid: {
          vertLines: { color: 'rgba(136, 177, 220, .065)' },
          horzLines: { color: 'rgba(136, 177, 220, .065)' },
        },
        rightPriceScale: { borderColor: 'rgba(136, 177, 220, .15)' },
        timeScale: {
          borderColor: 'rgba(136, 177, 220, .15)',
          timeVisible: !['1day', '1week', '1month'].includes(data.timeframe),
          secondsVisible: false,
        },
      });
      const precision = pricePrecision(data);
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#3fc7b0',
        downColor: '#ca8190',
        borderVisible: false,
        wickUpColor: '#3fc7b0',
        wickDownColor: '#ca8190',
        priceFormat: {
          type: 'price',
          precision,
          minMove: 10 ** -precision,
        },
      });
      series.setData(data.bars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })));
      chart.timeScale().fitContent();
      observer = new ResizeObserver(() => {
        chart?.resize(element.clientWidth, element.clientHeight);
      });
      observer.observe(element);
    }).catch(() => {
      if (mounted) setError('The chart could not be displayed. Refresh the page and try again.');
    });

    return () => {
      mounted = false;
      observer?.disconnect();
      chart?.remove();
    };
  }, [data]);

  return <div className={styles.chartFrame}>
    <div className={styles.chartSummary} aria-label="Most recent candle values">
      <strong>{data.symbol} · {data.timeframe}</strong>
      {lastBar && <><span>Open {lastBar.open}</span><span>High {lastBar.high}</span><span>Low {lastBar.low}</span><span>Close {lastBar.close}</span></>}
    </div>
    {error && <p className="form-status is-error" role="alert">{error}</p>}
    <div
      ref={container}
      className={styles.chartArea}
      role="img"
      aria-label={error || `${data.symbol} ${data.timeframe} candlestick chart with ${data.bars.length} bars from Twelve Data. Use the mouse or touch to pan and zoom.`}
    />
    <p className={styles.chartAttribution}>TradingView Lightweight Charts™ · Copyright (с) 2025 <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView, Inc.</a> Chart data provided by Twelve Data.</p>
  </div>;
}

function pricePrecision(data: MarketCandles) {
  const decimals = data.bars.flatMap((bar) => [bar.open, bar.high, bar.low, bar.close]).map((price) => {
    const [coefficient, exponent = '0'] = price.toString().split('e');
    return Math.max(0, (coefficient.split('.')[1]?.length ?? 0) - Number(exponent));
  });
  return Math.min(16, Math.max(2, ...decimals));
}

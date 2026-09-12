import { colorTokens } from "@/shared/styles/tokens";
import { categoryMarkerSvgs } from "../mapMarkerSvgs";
import { partnerMarkerSvg } from "../partnerMarkerSvg";

/** HTML의 지도 스크립트 안에 삽입할 마커·클러스터 관리 코드 */
export function buildMarkerScript(): string {
	const primary = colorTokens.primary;
	const canvas = colorTokens.canvas;
	const markerSvg = JSON.stringify(partnerMarkerSvg);
	const categorySvgsJson = JSON.stringify(categoryMarkerSvgs).replace(
		/</g,
		"\\u003c",
	);
	return `
    var storeMarkers = Object.create(null);
    var CATEGORY_MARKER_SVGS = ${categorySvgsJson};
    var CLUSTER_RADIUS_PX = 36;
    var storeData = [];
    var clusteringEnabled = false;

    function postMarkerPress(markerId) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_PRESS', markerId: String(markerId) }));
    }

    window.updateStoreMarkers = function(markers, options) {
      storeData = Array.isArray(markers) ? markers : [];
      clusteringEnabled = !!(options && options.clustering);
      renderStoreMarkers();
    };

    // 같은 ID와 표시 내용이면 기존 마커를 지도에 붙인 채 재사용한다.
    function retainStoreMarker(nextMarkers, key, signature, createMarker) {
      var previous = storeMarkers[key];
      nextMarkers[key] = previous && previous.signature === signature
        ? previous
        : { signature: signature, marker: createMarker() };
    }

    function renderStoreMarkers() {
      var nextMarkers = Object.create(null);
      var singles = [];
      var clusterable = [];
      storeData.forEach(function(markerData) {
        if (typeof markerData.latitude !== 'number' || typeof markerData.longitude !== 'number') return;
        if (clusteringEnabled && markerData.categoryMarker && markerData.selected !== true) {
          clusterable.push(markerData);
        } else {
          singles.push(markerData);
        }
      });

      // 응답 순서가 바뀌어도 같은 매장들은 같은 순서로 클러스터링한다.
      clusterable.sort(function(left, right) {
        var leftId = String(left.id);
        var rightId = String(right.id);
        return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
      });
      buildClusters(clusterable).forEach(function(cluster) {
        if (cluster.items.length > 1) {
          var key = 'cluster:' + JSON.stringify(cluster.items.map(function(item) { return String(item.id); }));
          var signature = JSON.stringify(cluster.items.map(function(item) { return [item.latitude, item.longitude]; }));
          retainStoreMarker(nextMarkers, key, signature, function() {
            return renderClusterMarker(cluster);
          });
        } else {
          singles.push(cluster.items[0]);
        }
      });
      singles.forEach(function(markerData) {
        var key = 'store:' + String(markerData.id);
        var signature = JSON.stringify([
          markerData.latitude, markerData.longitude, markerData.name,
          markerData.category, markerData.selected === true,
          markerData.categoryMarker === true, markerData.isPartnerMarker === true
        ]);
        retainStoreMarker(nextMarkers, key, signature, function() {
          return renderSingleMarker(markerData);
        });
      });

      // 새 마커를 붙인 뒤, 사라졌거나 교체된 항목만 제거한다.
      Object.keys(storeMarkers).forEach(function(key) {
        if (storeMarkers[key] !== nextMarkers[key]) {
          storeMarkers[key].marker.setMap(null);
        }
      });
      storeMarkers = nextMarkers;
    }

    function buildClusters(items) {
      if (items.length === 0) return [];
      var projection = map.getProjection();
      var clusters = [];
      items.forEach(function(item) {
        var point = projection.containerPointFromCoords(new kakao.maps.LatLng(item.latitude, item.longitude));
        var matched = null;
        for (var i = 0; i < clusters.length; i++) {
          var dx = clusters[i].x - point.x;
          var dy = clusters[i].y - point.y;
          if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_RADIUS_PX) { matched = clusters[i]; break; }
        }
        if (matched) {
          matched.items.push(item);
        } else {
          clusters.push({ x: point.x, y: point.y, items: [item] });
        }
      });
      return clusters;
    }

    function renderSingleMarker(markerData) {
      if (markerData.categoryMarker) return renderCategoryMarker(markerData);
      if (markerData.isPartnerMarker) return renderPartnerMarker(markerData);
      return renderDefaultMarker(markerData);
    }

    function renderCategoryMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var svgs = CATEGORY_MARKER_SVGS[markerData.category] || CATEGORY_MARKER_SVGS.OTHERS;
      var selected = markerData.selected === true;

      var container = document.createElement('button');
      container.type = 'button';
      container.style.cssText = 'border:0;background:transparent;padding:0;position:relative;width:70px;height:70px;cursor:pointer;overflow:visible;';
      container.setAttribute('aria-label', markerData.name || '제휴 가게');

      // 선택 마커 SVG는 원 중심이 y=42라 -7px 보정해 컨테이너 중심(35,35)에 맞춘다
      var icon = document.createElement('div');
      icon.style.cssText = 'position:absolute;left:0;top:' + (selected ? -7 : 0) + 'px;width:70px;pointer-events:none;';
      icon.innerHTML = selected ? svgs.selected : svgs.default;
      container.appendChild(icon);

      if (markerData.name) {
        var label = document.createElement('div');
        label.style.cssText = 'position:absolute;top:' + (selected ? 60 : 53) + 'px;left:50%;transform:translateX(-50%);text-align:center;white-space:nowrap;pointer-events:none;';
        var nameText = document.createElement('div');
        nameText.textContent = markerData.name;
        nameText.style.cssText = 'color:#040404;font-size:12px;font-weight:600;line-height:15px;text-shadow:0 0 3px ${canvas},0 0 3px ${canvas},0 0 3px ${canvas};';
        label.appendChild(nameText);
        container.appendChild(label);
      }

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        postMarkerPress(markerData.id);
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: selected ? 20 : 6
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderClusterMarker(cluster) {
      var latSum = 0;
      var lngSum = 0;
      cluster.items.forEach(function(item) { latSum += item.latitude; lngSum += item.longitude; });
      var position = new kakao.maps.LatLng(latSum / cluster.items.length, lngSum / cluster.items.length);

      var container = document.createElement('button');
      container.type = 'button';
      container.textContent = String(cluster.items.length);
      container.style.cssText = 'border:0;width:34px;height:34px;border-radius:50%;background:${canvas};box-shadow:0 0 10px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:#040404;cursor:pointer;';
      container.setAttribute('aria-label', cluster.items.length + '개 매장');

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        map.setLevel(map.getLevel() - 1, { anchor: position });
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 4
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderPartnerMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var selected = markerData.selected === true;
      var container = document.createElement('button');
      container.type = 'button';
      container.style.cssText = 'border:0;background:transparent;padding:0;display:flex;flex-direction:column;align-items:center;cursor:pointer;overflow:visible;';
      container.setAttribute('aria-label', markerData.name || '제휴 가게');

      var iconSize = selected ? 40 : 25;
      var shellSize = selected ? 60 : 25;
      var iconShell = document.createElement('div');
      iconShell.style.cssText = 'width:' + shellSize + 'px;height:' + shellSize + 'px;display:flex;align-items:center;justify-content:center;';
      var icon = document.createElement('div');
      icon.style.cssText = 'width:' + iconSize + 'px;height:' + iconSize + 'px;filter:drop-shadow(0 2px 4px rgba(0,104,254,0.35));transition:width 0.15s ease,height 0.15s ease;';
      icon.innerHTML = ${markerSvg};
      var svg = icon.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', String(iconSize));
        svg.setAttribute('height', String(iconSize));
      }
      iconShell.appendChild(icon);
      container.appendChild(iconShell);

      if (selected && markerData.name) {
        var label = document.createElement('span');
        label.textContent = markerData.name;
        label.style.cssText = 'margin-top:2px;color:${primary};font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;text-shadow:0 1px 2px ${canvas};';
        container.appendChild(label);
      }

      container.addEventListener('click', function(event) {
        event.stopPropagation();
        postMarkerPress(markerData.id);
      });

      var overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: container,
        xAnchor: 0.5,
        yAnchor: selected ? 0.35 : 0.5,
        zIndex: selected ? 20 : 5
      });
      overlay.setMap(map);
      return overlay;
    }

    function renderDefaultMarker(markerData) {
      var position = new kakao.maps.LatLng(markerData.latitude, markerData.longitude);
      var marker = new kakao.maps.Marker({ position: position, title: markerData.name || '' });
      kakao.maps.event.addListener(marker, 'click', function() {
        postMarkerPress(markerData.id);
      });
      marker.setMap(map);
      return marker;
    }
`;
}

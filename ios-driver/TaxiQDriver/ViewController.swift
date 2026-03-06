import UIKit
import WebKit
import CoreLocation

class ViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, CLLocationManagerDelegate {
    
    private var webView: WKWebView!
    private let locationManager = CLLocationManager()
    private var locationTimer: Timer?
    private let baseURL = "https://taxiq.com.pl/driver"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        view.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1)
        
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.showsBackgroundLocationIndicator = true
        
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs
        
        let contentController = WKUserContentController()
        contentController.add(LeakAvoider(delegate: self), name: "nativeBridge")
        config.userContentController = contentController
        
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1)
        webView.isOpaque = false
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = (webView.value(forKey: "userAgent") as? String ?? "") + " TaxiQDriverNative/1.0.0-iOS"
        
        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        
        if let url = URL(string: baseURL) {
            webView.load(URLRequest(url: url))
        }
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    func requestLocationPermission() {
        let status = locationManager.authorizationStatus
        switch status {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse:
            locationManager.requestAlwaysAuthorization()
        case .authorizedAlways:
            startLocationTracking()
        default:
            break
        }
    }
    
    func startLocationTracking() {
        locationManager.startUpdatingLocation()
        locationTimer?.invalidate()
        locationTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.sendLocationToServer()
        }
    }
    
    func stopLocationTracking() {
        locationManager.stopUpdatingLocation()
        locationTimer?.invalidate()
        locationTimer = nil
    }
    
    private func sendLocationToServer() {
        guard let location = locationManager.location else { return }
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude
        
        let js = """
        if (window.nativeLocationCallback) {
            window.nativeLocationCallback(\(lat), \(lng));
        }
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
    
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse:
            locationManager.requestAlwaysAuthorization()
        case .authorizedAlways:
            startLocationTracking()
        default:
            break
        }
    }
    
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }
        
        if url.scheme == "tel" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        
        if let host = url.host, host.contains("taxiq.com.pl") {
            decisionHandler(.allow)
            return
        }
        
        if navigationAction.navigationType == .linkActivated {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        
        decisionHandler(.allow)
    }
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let js = """
        window.isNativeApp = true;
        window.nativePlatform = 'ios';
        window.requestNativeLocation = function() {
            window.webkit.messageHandlers.nativeBridge.postMessage({action: 'requestLocation'});
        };
        window.startNativeLocationTracking = function() {
            window.webkit.messageHandlers.nativeBridge.postMessage({action: 'startTracking'});
        };
        window.stopNativeLocationTracking = function() {
            window.webkit.messageHandlers.nativeBridge.postMessage({action: 'stopTracking'});
        };
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
    
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }
}

extension ViewController: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }
        
        switch action {
        case "requestLocation":
            requestLocationPermission()
        case "startTracking":
            requestLocationPermission()
            startLocationTracking()
        case "stopTracking":
            stopLocationTracking()
        default:
            break
        }
    }
}

class LeakAvoider: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
        super.init()
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

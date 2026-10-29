//
//  ContentView.swift
//  Artefact — Цифровой этнографический музей (iOS Beta)
//

import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var webViewState = WebViewState()

    var body: some View {
        ZStack {
            Color(red: 0.027, green: 0.051, blue: 0.118) // #070d1e
                .ignoresSafeArea()

            WebViewContainer(state: webViewState)
                .ignoresSafeArea(edges: .bottom)

            if webViewState.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(red: 0.788, green: 0.612, blue: 0.322)))
                        .scaleEffect(1.4)
                    Text("АРТЕФАКТ")
                        .font(.custom("CormorantGaramond-Regular", size: 18))
                        .foregroundColor(Color(red: 0.788, green: 0.612, blue: 0.322))
                        .tracking(2.0)
                }
                .transition(.opacity)
            }

            if webViewState.hasError {
                VStack(spacing: 20) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 48))
                        .foregroundColor(Color(red: 0.788, green: 0.612, blue: 0.322))

                    Text("Связь с музейным сервером")
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(webViewState.errorMessage)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundColor(Color.gray)
                        .padding(.horizontal, 32)

                    Button(action: {
                        webViewState.reload()
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Повторить подключение")
                        }
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.black)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color(red: 0.788, green: 0.612, blue: 0.322))
                        .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color(red: 0.043, green: 0.078, blue: 0.161).opacity(0.96))
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(red: 0.788, green: 0.612, blue: 0.322).opacity(0.3), lineWidth: 1)
                )
                .padding(24)
            }
        }
    }
}

// MARK: - WebViewState Observable
final class WebViewState: ObservableObject {
    @Published var isLoading: Bool = true
    @Published var hasError: Bool = false
    @Published var errorMessage: String = ""

    var webView: WKWebView?

    func reload() {
        hasError = false
        isLoading = true
        if let webView = webView {
            if let url = webView.url {
                webView.load(URLRequest(url: url))
            } else {
                #if DEBUG
                let initialUrl = URL(string: "http://127.0.0.1:8080/")!
                #else
                let initialUrl = URL(string: "https://vintape.github.io/projecthistory.github.io/")!
                #endif
                webView.load(URLRequest(url: initialUrl))
            }
        }
    }
}

// MARK: - WebViewContainer Representable
struct WebViewContainer: UIViewRepresentable {
    @ObservedObject var state: WebViewState

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let contentController = WKUserContentController()

        // Регистрация нативного bridge для Haptic Feedback и логов
        contentController.add(context.coordinator, name: "haptic")
        contentController.add(context.coordinator, name: "nativeLog")

        // Скрипт инъекции поддержки iOS Safe Area & Native Bridge
        let bridgeScript = WKUserScript(
            source: """
            window.isNativeIOSApp = true;
            window.webkitBridgeReady = true;
            console.log('🏛️ iOS Native WebKit Bridge Activated');
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        contentController.addUserScript(bridgeScript)

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.027, green: 0.051, blue: 0.118, alpha: 1.0)
        webView.scrollView.backgroundColor = UIColor(red: 0.027, green: 0.051, blue: 0.118, alpha: 1.0)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = true

        // Pull-to-refresh
        let refreshControl = UIRefreshControl()
        refreshControl.tintColor = UIColor(red: 0.788, green: 0.612, blue: 0.322, alpha: 1.0)
        refreshControl.addTarget(context.coordinator, action: #selector(Coordinator.handleRefreshControl(sender:)), for: .valueChanged)
        webView.scrollView.refreshControl = refreshControl

        state.webView = webView

        // Загрузка локального dev-сервера или продакшн GitHub Pages
        #if DEBUG
        let primaryUrl = URL(string: "http://127.0.0.1:8080/")!
        #else
        let primaryUrl = URL(string: "https://vintape.github.io/projecthistory.github.io/")!
        #endif
        let request = URLRequest(url: primaryUrl, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 4.0)
        webView.load(request)

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "haptic")
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "nativeLog")
    }

    // MARK: - Coordinator & WKScriptMessageHandler
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebViewContainer

        init(_ parent: WebViewContainer) {
            self.parent = parent
        }

        @objc func handleRefreshControl(sender: UIRefreshControl) {
            parent.state.webView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                sender.endRefreshing()
            }
        }

        // WebKit Navigation Delegates
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.state.isLoading = true
                self.parent.state.hasError = false
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.state.isLoading = false
                self.parent.state.hasError = false
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let nsError = error as NSError
            // Попытка фоллбэка на GitHub Pages при недоступности localhost
            if nsError.domain == NSURLErrorDomain && (nsError.code == NSURLErrorCannotConnectToHost || nsError.code == NSURLErrorTimedOut) {
                let failingUrl = (nsError.userInfo[NSURLErrorFailingURLStringErrorKey] as? String) ?? webView.url?.absoluteString ?? ""
                if failingUrl.contains("127.0.0.1") || failingUrl.contains("localhost") {
                    let fallbackUrl = URL(string: "https://vintape.github.io/projecthistory.github.io/")!
                    webView.load(URLRequest(url: fallbackUrl))
                    return
                }
            }

            DispatchQueue.main.async {
                self.parent.state.isLoading = false
                self.parent.state.hasError = true
                self.parent.state.errorMessage = error.localizedDescription
            }
        }

        // WKScriptMessageHandler: iOS Haptic Feedback Bridge
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "haptic" {
                guard let dict = message.body as? [String: Any],
                      let type = dict["type"] as? String else {
                    let generator = UIImpactFeedbackGenerator(style: .light)
                    generator.impactOccurred()
                    return
                }

                DispatchQueue.main.async {
                    switch type {
                    case "light":
                        let gen = UIImpactFeedbackGenerator(style: .light)
                        gen.impactOccurred()
                    case "medium":
                        let gen = UIImpactFeedbackGenerator(style: .medium)
                        gen.impactOccurred()
                    case "heavy":
                        let gen = UIImpactFeedbackGenerator(style: .heavy)
                        gen.impactOccurred()
                    case "soft":
                        let gen = UIImpactFeedbackGenerator(style: .soft)
                        gen.impactOccurred()
                    case "rigid":
                        let gen = UIImpactFeedbackGenerator(style: .rigid)
                        gen.impactOccurred()
                    case "success":
                        let gen = UINotificationFeedbackGenerator()
                        gen.notificationOccurred(.success)
                    case "warning":
                        let gen = UINotificationFeedbackGenerator()
                        gen.notificationOccurred(.warning)
                    case "error":
                        let gen = UINotificationFeedbackGenerator()
                        gen.notificationOccurred(.error)
                    case "selection":
                        let gen = UISelectionFeedbackGenerator()
                        gen.selectionChanged()
                    default:
                        let gen = UIImpactFeedbackGenerator(style: .light)
                        gen.impactOccurred()
                    }
                }
            } else if message.name == "nativeLog" {
                if let logText = message.body as? String {
                    print("📱 [iOS WebKit Log] \(logText)")
                }
            }
        }
    }
}

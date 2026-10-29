//
//  ArtefactApp.swift
//  Artefact — Цифровой этнографический музей (iOS Beta)
//

import SwiftUI

@main
struct ArtefactApp: App {
    init() {
        // Настройка музейного фона и панелей под темную тему
        let navBarAppearance = UINavigationBarAppearance()
        navBarAppearance.configureWithOpaqueBackground()
        navBarAppearance.backgroundColor = UIColor(red: 0.027, green: 0.051, blue: 0.118, alpha: 1.0) // #070d1e
        navBarAppearance.titleTextAttributes = [.foregroundColor: UIColor(red: 0.788, green: 0.612, blue: 0.322, alpha: 1.0)] // #c99c52
        UINavigationBar.appearance().standardAppearance = navBarAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navBarAppearance
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .background(Color(red: 0.027, green: 0.051, blue: 0.118))
        }
    }
}

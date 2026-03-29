//
//  Config.swift
//  MindLogHelper
//
//  Created by Hannah Lee on 3/28/26.
//

import Foundation

enum Config {
    static var presageAPIKey: String {
        guard let url = Bundle.main.url(forResource: "Config", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let plist = try? PropertyListSerialization.propertyList(from: data, format: nil),
              let dict = plist as? [String: Any],
              let key = dict["PRESAGE_API_KEY"] as? String else {
            fatalError("Missing PRESAGE_API_KEY in Config.plist")
        }
        return key
    }
}

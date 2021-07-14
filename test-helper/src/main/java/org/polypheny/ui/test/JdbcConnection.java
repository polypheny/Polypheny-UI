/*
 * Copyright 2019-2021 The Polypheny Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.polypheny.ui.test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;
import lombok.extern.slf4j.Slf4j;


@Slf4j
public class JdbcConnection implements AutoCloseable {

    private final static String dbHost = "localhost";
    private final static int port = 20591;

    private final Connection conn;


    public JdbcConnection( boolean autoCommit ) throws SQLException {
        try {
            Class.forName( "org.polypheny.jdbc.Driver" );
        } catch ( ClassNotFoundException e ) {
            log.error( "Polypheny JDBC Driver not found", e );
        }
        final String url = "jdbc:polypheny:http://" + dbHost + ":" + port;
        log.debug( "Connecting to database @ {}", url );

        Properties props = new Properties();
        props.setProperty( "user", "pa" );
        props.setProperty( "serialization", "PROTOBUF" );

        conn = DriverManager.getConnection( url, props );
        conn.setAutoCommit( autoCommit );
    }


    public Connection getConnection() {
        return conn;
    }


    @Override
    public void close() throws SQLException {
        conn.commit();
        conn.close();
    }

}
